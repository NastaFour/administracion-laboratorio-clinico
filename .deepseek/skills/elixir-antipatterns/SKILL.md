---
name: elixir-antipatterns
description: >
  Elixir common anti-patterns and how to fix them: improper use of Agent/GenServer, nested
  case expressions, unnecessary atoms, process over-use, and missing supervision trees.
  Trigger when reviewing or writing Elixir/Phoenix code, or when the user asks about
  Elixir best practices, OTP patterns, or GenServer design.
license: MIT
compatibility: "Works with Claude Code, Cursor, Gemini, and any other agentskills.io compatible agent. Requires Elixir 1.15+."
allowed-tools: Read
metadata:
  author: gentleman-programming
  version: "1.0"
  category: 06-code-quality
  tags: [elixir, phoenix, otp, genserver, antipatterns, supervision, pattern-matching]
---

# Elixir Anti-Patterns — How to Fix Them

## Anti-Pattern 1: Unnecessary Atom Creation

```elixir
# ❌ DON'T: Converting user input to atoms — atoms are never garbage collected
def process_event(event_type) do
  String.to_atom(event_type)  # Memory leak risk!
end

# ✅ DO: Use String.to_existing_atom/1 or keep as strings
def process_event(event_type) do
  String.to_existing_atom(event_type)  # Only converts if atom already exists
rescue
  ArgumentError -> {:error, :unknown_event_type}
end

# ✅ BETTER: Pattern match on strings directly
def process_event("order_placed"), do: handle_order_placed()
def process_event("order_cancelled"), do: handle_order_cancelled()
def process_event(_unknown), do: {:error, :unknown_event_type}
```

---

## Anti-Pattern 2: Deeply Nested `case` Expressions

```elixir
# ❌ DON'T: Pyramid of doom
def process_order(order_id) do
  case fetch_order(order_id) do
    {:ok, order} ->
      case validate_order(order) do
        {:ok, valid_order} ->
          case charge_payment(valid_order) do
            {:ok, payment} ->
              {:ok, payment}
            {:error, reason} ->
              {:error, reason}
          end
        {:error, reason} ->
          {:error, reason}
      end
    {:error, reason} ->
      {:error, reason}
  end
end

# ✅ DO: Use the `with` expression
def process_order(order_id) do
  with {:ok, order}       <- fetch_order(order_id),
       {:ok, valid_order} <- validate_order(order),
       {:ok, payment}     <- charge_payment(valid_order) do
    {:ok, payment}
  end
end

# ✅ EVEN BETTER: with custom error handling
def process_order(order_id) do
  with {:ok, order}       <- fetch_order(order_id),
       {:ok, valid_order} <- validate_order(order),
       {:ok, payment}     <- charge_payment(valid_order) do
    {:ok, payment}
  else
    {:error, :not_found}  -> {:error, "Order not found"}
    {:error, :invalid}    -> {:error, "Order validation failed"}
    {:error, :declined}   -> {:error, "Payment declined"}
  end
end
```

---

## Anti-Pattern 3: Using Agent as a Database

```elixir
# ❌ DON'T: Agent as global mutable state for complex data
defmodule OrderStore do
  use Agent

  def start_link(_), do: Agent.start_link(fn -> %{} end, name: __MODULE__)
  def put(id, order), do: Agent.update(__MODULE__, &Map.put(&1, id, order))
  def get(id), do: Agent.get(__MODULE__, &Map.get(&1, id))
  def all, do: Agent.get(__MODULE__, & &1)  # Grows forever!
end

# ✅ DO: Use ETS for in-process storage, or a proper DB
defmodule OrderCache do
  def init do
    :ets.new(:order_cache, [:named_table, :set, :public, read_concurrency: true])
  end

  def put(id, order), do: :ets.insert(:order_cache, {id, order})
  def get(id) do
    case :ets.lookup(:order_cache, id) do
      [{^id, order}] -> {:ok, order}
      [] -> {:error, :not_found}
    end
  end
end

# ✅ BETTER: Use Ecto + PostgreSQL for persistent data
```

---

## Anti-Pattern 4: Spawning Processes Without Supervision

```elixir
# ❌ DON'T: Bare spawn — process crash is silent
def handle_event(event) do
  spawn(fn -> process_event(event) end)
end

# ✅ DO: Use Task.Supervisor
def handle_event(event) do
  Task.Supervisor.start_child(MyApp.TaskSupervisor, fn ->
    process_event(event)
  end)
end

# In application.ex
children = [
  {Task.Supervisor, name: MyApp.TaskSupervisor},
  # ...
]

# ✅ DO: Use Task.async_stream for bounded concurrency
def process_events(events) do
  events
  |> Task.async_stream(&process_event/1, max_concurrency: 10, timeout: 5_000)
  |> Enum.reduce([], fn
    {:ok, result}, acc -> [result | acc]
    {:exit, reason}, acc ->
      Logger.error("Event processing failed: #{inspect(reason)}")
      acc
  end)
end
```

---

## Anti-Pattern 5: GenServer Bottleneck

```elixir
# ❌ DON'T: All reads going through GenServer state
defmodule CounterServer do
  use GenServer

  def get_count, do: GenServer.call(__MODULE__, :get_count)
  def get_stats, do: GenServer.call(__MODULE__, :get_stats)  # Serialized!

  def handle_call(:get_count, _from, state), do: {:reply, state.count, state}
  def handle_call(:get_stats, _from, state), do: {:reply, compute_stats(state), state}
  # compute_stats/1 blocks all other calls while running
end

# ✅ DO: Compute outside GenServer, use ETS for reads
defmodule CounterServer do
  use GenServer

  def start_link(_) do
    GenServer.start_link(__MODULE__, %{}, name: __MODULE__)
  end

  def init(state) do
    :ets.new(:counter_table, [:named_table, :set, :public, read_concurrency: true])
    {:ok, state}
  end

  # Reads bypass GenServer — concurrent via ETS
  def get_count do
    case :ets.lookup(:counter_table, :count) do
      [{:count, n}] -> n
      [] -> 0
    end
  end

  # Writes go through GenServer — serialized and safe
  def increment do
    GenServer.cast(__MODULE__, :increment)
  end

  def handle_cast(:increment, state) do
    new_count = Map.get(state, :count, 0) + 1
    :ets.insert(:counter_table, {:count, new_count})
    {:noreply, Map.put(state, :count, new_count)}
  end
end
```

---

## Anti-Pattern 6: Missing Pattern Match Clauses

```elixir
# ❌ DON'T: Silently ignoring unexpected values
def process_status(status) do
  case status do
    :pending -> handle_pending()
    :confirmed -> handle_confirmed()
    # What about :cancelled, :failed, unknown values?
  end
end

# ✅ DO: Explicit catch-all with error logging
def process_status(status) do
  case status do
    :pending   -> handle_pending()
    :confirmed -> handle_confirmed()
    :cancelled -> handle_cancelled()
    unknown ->
      Logger.warning("Unknown status received: #{inspect(unknown)}")
      {:error, {:unknown_status, unknown}}
  end
end
```

---

## Anti-Pattern 7: Large Message Passing

```elixir
# ❌ DON'T: Sending large binaries between processes
def process_file(path) do
  content = File.read!(path)  # Could be 100MB+
  send(processor_pid, {:process, content})  # Copies entire binary
end

# ✅ DO: Send the path, let the other process read it
def process_file(path) do
  send(processor_pid, {:process_file, path})
end

# ✅ BETTER: Use :ets or a reference for shared data
def process_file(path) do
  ref = make_ref()
  content = File.read!(path)
  :ets.insert(:shared_data, {ref, content})
  send(processor_pid, {:process_ref, ref})
  ref
end
```

---

## Supervision Tree Pattern

```elixir
# lib/my_app/application.ex
defmodule MyApp.Application do
  use Application

  def start(_type, _args) do
    children = [
      # Ecto Repo
      MyApp.Repo,
      # PubSub
      {Phoenix.PubSub, name: MyApp.PubSub},
      # Task supervisors
      {Task.Supervisor, name: MyApp.TaskSupervisor},
      # Domain workers
      MyApp.OrderProcessor,
      MyApp.NotificationWorker,
      # Web endpoint (last)
      MyAppWeb.Endpoint,
    ]

    opts = [strategy: :one_for_one, name: MyApp.Supervisor]
    Supervisor.start_link(children, opts)
  end
end
```

---

## Integration con skillsGV

Esta skill es específica para proyectos Elixir/Phoenix. Combinar con: `solid-clean-code` (principios generales), `testing-patterns` (ExUnit patterns), `postgresql` (Ecto + PostgreSQL), `observability` (Telemetry en Phoenix).
