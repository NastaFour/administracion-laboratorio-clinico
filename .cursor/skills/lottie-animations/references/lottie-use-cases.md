# Lottie Use Cases

## 1. Onboarding Flow

```tsx
const onboardingSteps = [
  { animation: "welcome.lottie", title: "Welcome", text: "Book a barber to your door" },
  { animation: "book.lottie", title: "Easy Booking", text: "Choose service, barber, time" },
  { animation: "track.lottie", title: "Live Tracking", text: "Watch your barber arrive" },
  { animation: "enjoy.lottie", title: "Enjoy", text: "Premium service at home" },
];

function Onboarding() {
  const [step, setStep] = useState(0);
  const current = onboardingSteps[step];

  return (
    <div className="flex flex-col items-center min-h-screen p-8">
      <DotLottieReact
        key={step}
        src={`/animations/${current.animation}`}
        loop
        autoplay
        className="w-64 h-64"
      />
      <h1 className="text-3xl font-bold mt-8">{current.title}</h1>
      <p className="text-white/60 mt-2 text-center">{current.text}</p>
      <div className="flex gap-2 mt-8">
        {onboardingSteps.map((_, i) => (
          <div key={i} className={`h-2 rounded-full transition-all ${i === step ? "w-8 bg-primary" : "w-2 bg-white/20"}`} />
        ))}
      </div>
      <button onClick={() => step < 3 ? setStep(step + 1) : finish()} className="mt-8 bg-primary px-8 py-3 rounded-xl">
        {step < 3 ? "Next" : "Get Started"}
      </button>
    </div>
  );
}
```

## 2. Empty States

```tsx
function EmptyBookings() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <DotLottieReact src="/animations/empty-calendar.lottie" loop autoplay className="w-40 h-40" />
      <h3 className="text-xl font-semibold mt-6">No bookings yet</h3>
      <p className="text-white/50 mt-2">Book your first barber service</p>
      <button className="mt-6 bg-primary px-6 py-2 rounded-lg">Browse barbers</button>
    </div>
  );
}
```

## 3. Success Celebration

```tsx
function BookingSuccess({ onDismiss }) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <motion.div initial={{scale:0.8}} animate={{scale:1}} className="bg-neutral-900 rounded-3xl p-8 text-center">
        <DotLottieReact
          src="/animations/success-check.lottie"
          loop={false}
          autoplay
          className="w-32 h-32 mx-auto"
          onComplete={() => setTimeout(onDismiss, 500)}
        />
        <h2 className="text-2xl font-bold mt-4">Booking confirmed!</h2>
        <p className="text-white/60 mt-2">Your barber is on the way</p>
      </motion.div>
    </div>
  );
}
```

## 4. Loading (Fun Alternative to Spinner)

```tsx
function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20">
      <DotLottieReact
        src="/animations/loading-scissors.lottie"
        loop
        autoplay
        className="w-24 h-24"
      />
    </div>
  );
}
```

## 5. Error State

```tsx
function ErrorState({ onRetry }) {
  return (
    <div className="flex flex-col items-center py-20">
      <DotLottieReact src="/animations/error.lottie" loop={false} autoplay className="w-32 h-32" />
      <h3 className="text-xl font-semibold mt-6 text-red-400">Something went wrong</h3>
      <button onClick={onRetry} className="mt-4 text-primary">Try again</button>
    </div>
  );
}
```

## Best Practices

| Use Case | Loop | Duration | Size |
|---|---|---|---|
| Onboarding | Yes | 3-5s | < 50KB |
| Empty state | Yes | 4-8s | < 30KB |
| Success | No (play once) | 2-3s | < 40KB |
| Loading | Yes | 1-3s | < 20KB |
| Error | No | 2s | < 30KB |
