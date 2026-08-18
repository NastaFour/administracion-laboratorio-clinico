---
name: angular-core
description: Angular core patterns — standalone components (no `standalone: true`), input/output functions, signals for state, NO lifecycle hooks (signals + effect replace them), inject() over constructor, native control flow (@if/@for/@switch), zoneless Angular, RxJS only when needed. Use when creating Angular components or setting up zoneless so the AI does not regress to decorators and ZoneJS.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Angular 20+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["angular core", "angular standalone", "angular signals", "angular zoneless", "inject()", "input() output()", "native control flow", "@if @for @switch"]
  scope: [global, project]
  version: "1.0.0"
---

# Angular Core

## Standalone Components (REQUIRED)

Components are standalone by default. Do NOT set `standalone: true`.

```typescript
@Component({
  selector: 'app-user',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `...`
})
export class UserComponent {}
```

## Input/Output Functions (REQUIRED)

```typescript
// ✅ ALWAYS: Function-based
readonly user = input.required<User>();
readonly disabled = input(false);
readonly selected = output<User>();
readonly checked = model(false);  // Two-way binding
// ❌ NEVER: Decorators
@Input() user: User;
@Output() selected = new EventEmitter<User>();
```

## Signals for State (REQUIRED)

```typescript
readonly count = signal(0);
readonly doubled = computed(() => this.count() * 2);
this.count.set(5);
this.count.update(prev => prev + 1);
effect(() => localStorage.setItem('count', this.count().toString()));
```

## NO Lifecycle Hooks (REQUIRED)

Signals replace lifecycle hooks. Do NOT use `ngOnInit`, `ngOnChanges`, `ngOnDestroy`.

```typescript
// ❌ NEVER: Lifecycle hooks
ngOnInit() { this.loadUser(); }
ngOnChanges(changes: SimpleChanges) { if (changes['userId']) { this.loadUser(); } }
// ✅ ALWAYS: Signals + effect
readonly userId = input.required<string>();
readonly user = signal<User | null>(null);
private userEffect = effect(() => { this.loadUser(this.userId()); });
readonly displayName = computed(() => this.user()?.name ?? 'Guest');
```

When to use what: react to input changes → `effect()` watching the input; derived/computed state → `computed()`; side effects (API, localStorage) → `effect()`; cleanup on destroy → `DestroyRef` + `inject()`.

```typescript
private readonly destroyRef = inject(DestroyRef);
constructor() {
  const subscription = someObservable$.subscribe();
  this.destroyRef.onDestroy(() => subscription.unsubscribe());
}
```

## inject() Over Constructor (REQUIRED)

```typescript
// ✅ ALWAYS
private readonly http = inject(HttpClient);
// ❌ NEVER
constructor(private http: HttpClient) {}
```

## Native Control Flow (REQUIRED)

```html
@if (loading()) {
  <spinner />
} @else {
  @for (item of items(); track item.id) {
    <item-card [data]="item" />
  } @empty {
    <p>No items</p>
  }
}
@switch (status()) {
  @case ('active') { <span>Active</span> }
  @default { <span>Unknown</span> }
}
```

## RxJS — Only When Needed

Signals are the default. Use RxJS ONLY for complex async.

| Use Signals | Use RxJS |
|-------------|----------|
| Component state | Combining multiple streams |
| Derived values | Debounce/throttle |
| Simple async (single API call) | Race conditions |
| Input/Output | WebSockets, real-time |
| | Complex error retry logic |

```typescript
// ✅ Simple API call - use signals
readonly user = signal<User | null>(null);
readonly loading = signal(false);
async loadUser(id: string) {
  this.loading.set(true);
  this.user.set(await firstValueFrom(this.http.get<User>(`/api/users/${id}`)));
  this.loading.set(false);
}
// ✅ Complex stream - use RxJS
readonly searchResults$ = this.searchTerm$.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap(term => this.http.get<Results>(`/api/search?q=${term}`))
);
readonly searchResults = toSignal(this.searchResults$, { initialValue: [] });
```

## Zoneless Angular (REQUIRED)

```typescript
bootstrapApplication(AppComponent, {
  providers: [provideZonelessChangeDetection()]
});
```

Remove ZoneJS: `pnpm remove zone.js` and remove `zone.js`/`zone.js/testing` from `angular.json` polyfills. Zoneless requirements: `OnPush` change detection, signals for state (auto-notifies Angular), `AsyncPipe` for observables, `markForCheck()` when needed.

## Resources

- https://angular.dev/guide/signals
- https://angular.dev/guide/templates/control-flow
- https://angular.dev/guide/zoneless