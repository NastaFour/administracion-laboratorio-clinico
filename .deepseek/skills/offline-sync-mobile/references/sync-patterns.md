# Offline Sync Patterns

## Local Queue Architecture

```typescript
// stores/offline-queue.store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PendingOperation {
  id: string;
  type: "CREATE_BOOKING" | "UPDATE_PROFILE" | "CREATE_REVIEW";
  payload: unknown;
  createdAt: number;
  attempts: number;
}

interface OfflineQueueStore {
  operations: PendingOperation[];
  isOnline: boolean;
  isSyncing: boolean;
  addOperation: (op: Omit<PendingOperation, "id" | "createdAt" | "attempts">) => void;
  removeOperation: (id: string) => void;
  incrementAttempts: (id: string) => void;
  setOnline: (online: boolean) => void;
}

export const useOfflineQueue = create<OfflineQueueStore>()(
  persist(
    (set) => ({
      operations: [],
      isOnline: true,
      isSyncing: false,
      addOperation: (op) =>
        set((s) => ({
          operations: [...s.operations, { ...op, id: crypto.randomUUID(), createdAt: Date.now(), attempts: 0 }],
        })),
      removeOperation: (id) => set((s) => ({ operations: s.operations.filter((o) => o.id !== id) })),
      incrementAttempts: (id) => set((s) => ({ operations: s.operations.map((o) => o.id === id ? { ...o, attempts: o.attempts + 1 } : o) })),
      setOnline: (online) => set({ isOnline: online }),
    }),
    { name: "offline-queue" }
  )
);
```

## Background Sync

```typescript
import { useEffect } from "react";
import NetInfo from "@react-native-community/netinfo";
import { useOfflineQueue } from "../stores/offline-queue.store";

function useOfflineSync() {
  const { operations, isOnline, removeOperation, incrementAttempts, setOnline } = useOfflineQueue();

  // Listen to network changes
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setOnline(state.isConnected ?? false);
      if (state.isConnected && operations.length > 0) {
        syncPendingOperations();
      }
    });
    return () => unsubscribe();
  }, []);

  // Sync on app launch
  useEffect(() => {
    if (operations.length > 0) syncPendingOperations();
  }, []);

  async function syncPendingOperations() {
    for (const op of operations) {
      try {
        await executeOperation(op);
        removeOperation(op.id);
      } catch (error) {
        incrementAttempts(op.id);
        if (op.attempts >= 5) {
          // Give up after 5 attempts, notify user
          Alert.alert("Sync failed", `Operation ${op.type} could not be synced after 5 attempts.`);
          removeOperation(op.id);
        }
      }
    }
  }
}
```

## Optimistic UI

```typescript
async function createBooking(input: BookingInput) {
  // Optimistic: add to local state immediately
  const tempBooking = { ...input, id: `temp-${Date.now()}`, status: "PENDING" };
  queryClient.setQueryData(["bookings"], (old) => [...old, tempBooking]);

  if (!isOnline) {
    // Queue for later sync
    addOperation({ type: "CREATE_BOOKING", payload: input });
    return tempBooking;
  }

  try {
    const realBooking = await api.createBooking(input);
    // Replace temp with real
    queryClient.setQueryData(["bookings"], (old) =>
      old.map((b) => (b.id === tempBooking.id ? realBooking : b))
    );
    return realBooking;
  } catch (error) {
    // Rollback
    queryClient.setQueryData(["bookings"], (old) =>
      old.filter((b) => b.id !== tempBooking.id)
    );
    throw error;
  }
}
```
