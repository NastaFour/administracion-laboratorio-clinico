# React Hook Form + Zod Pattern

## 1. Shared Schema Definition

```typescript
// packages/shared-types/src/schemas/auth.ts
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z.string().min(2, "Name too short"),
  email: z.string().email("Invalid email"),
  phone: z.string().regex(/^\+?[\d\s-]+$/, "Invalid phone"),
  password: z.string().min(8, "Min 8 characters"),
  role: z.enum(["CLIENT", "BARBER"]),
});

export type RegisterInput = z.infer<typeof registerSchema>;
```

## 2. Web Form (React + Vite)

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@scope/shared-types";

export function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      await authApi.login(data);
    } catch (err) {
      // handle error
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" {...register("email")} />
        {errors.email && <span className="error">{errors.email.message}</span>}
      </div>

      <div>
        <label htmlFor="password">Password</label>
        <input id="password" type="password" {...register("password")} />
        {errors.password && <span className="error">{errors.password.message}</span>}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Loading..." : "Login"}
      </button>
    </form>
  );
}
```

## 3. Mobile Form (React Native + Expo)

```tsx
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TextInput, Button, Text } from "react-native";
import { loginSchema, type LoginInput } from "@scope/shared-types";

export function LoginForm() {
  const { control, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginInput) => {
    await authApi.login(data);
  };

  return (
    <>
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, value } }) => (
          <TextInput
            value={value}
            onChangeText={onChange}
            placeholder="Email"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        )}
      />
      {errors.email && <Text style={styles.error}>{errors.email.message}</Text>}

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, value } }) => (
          <TextInput
            value={value}
            onChangeText={onChange}
            placeholder="Password"
            secureTextEntry
          />
        )}
      />
      {errors.password && <Text style={styles.error}>{errors.password.message}</Text>}

      <Button
        title={isSubmitting ? "Loading..." : "Login"}
        onPress={handleSubmit(onSubmit)}
        disabled={isSubmitting}
      />
    </>
  );
}
```

## 4. Error Display Patterns

### Inline Error (per field)
```tsx
{errors.email && <span className="text-red-500 text-sm">{errors.email.message}</span>}
```

### Error Summary (top of form, for accessibility)
```tsx
{Object.keys(errors).length > 0 && (
  <div role="alert" className="bg-red-50 p-3 rounded">
    <p>Please fix the following errors:</p>
    <ul>
      {Object.entries(errors).map(([field, err]) => (
        <li key={field}>{err.message}</li>
      ))}
    </ul>
  </div>
)}
```

### Toast (on submit error)
```tsx
const onSubmit = async (data) => {
  try {
    await api.submit(data);
    toast.success("Saved!");
  } catch (err) {
    toast.error(err.message);
  }
};
```

## 5. Async Validation (unique email check)

```typescript
const registerSchema = z.object({
  email: z.string().email().refine(
    async (email) => {
      const res = await fetch(`/api/auth/check-email?email=${email}`);
      const { available } = await res.json();
      return available;
    },
    "Email already registered"
  ),
});
```

Use with `mode: "onBlur"` to debounce the async check.
