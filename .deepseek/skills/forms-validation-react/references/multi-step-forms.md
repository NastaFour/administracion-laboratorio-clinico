# Multi-Step Forms (Wizard)

## Pattern: Per-Step Validation

```tsx
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Step 1: Service selection
const step1Schema = z.object({
  serviceId: z.string().min(1, "Select a service"),
  barberId: z.string().min(1, "Select a barber").optional(),
});

// Step 2: Date/time selection
const step2Schema = z.object({
  date: z.string().min(1, "Select a date"),
  startTime: z.string().min(1, "Select a time"),
});

// Step 3: Location + notes
const step3Schema = z.object({
  address: z.string().min(5, "Enter your address"),
  lat: z.number(),
  lng: z.number(),
  notes: z.string().optional(),
});

// Full schema (for final validation before submit)
const bookingSchema = step1Schema.and(step2Schema).and(step3Schema);

type BookingForm = z.infer<typeof bookingSchema>;

const stepSchemas = [step1Schema, step2Schema, step3Schema];

export function BookingWizard() {
  const [step, setStep] = useState(0);
  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
    mode: "onBlur",
  });

  const nextStep = async () => {
    // Validate only the current step's fields
    const stepFields = Object.keys(stepSchemas[step].shape);
    const valid = await trigger(stepFields as (keyof BookingForm)[]);
    if (valid) setStep(s => Math.min(s + 1, 2));
  };

  const prevStep = () => setStep(s => Math.max(s - 1, 0));

  const onSubmit = async (data: BookingForm) => {
    await bookingApi.create(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {step === 0 && (
        <div>
          <h2>Step 1: Service</h2>
          {/* service + barber selectors */}
          <button type="button" onClick={nextStep}>Next</button>
        </div>
      )}

      {step === 1 && (
        <div>
          <h2>Step 2: Date & Time</h2>
          {/* date + time selectors */}
          <button type="button" onClick={prevStep}>Back</button>
          <button type="button" onClick={nextStep}>Next</button>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2>Step 3: Location</h2>
          {/* address + map */}
          <button type="button" onClick={prevStep}>Back</button>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Booking..." : "Confirm Booking"}
          </button>
        </div>
      )}
    </form>
  );
}
```

## Key Points

1. **One `useForm` for all steps**: Don't create separate forms per step. Use one form with the full schema.
2. **`trigger(fields)` for step validation**: Only validate the current step's fields before advancing.
3. **Full validation on submit**: The resolver uses the full `bookingSchema`, so all fields are validated at the end.
4. **Preserve state between steps**: Since it's one form, going back doesn't lose data.
5. **Progress indicator**: Show `Step 1 of 3` and a progress bar.
