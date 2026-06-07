import { Stack } from 'expo-router';

export default function LegalLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="privacy-policy"
        options={{
          headerShown: false,
          title: 'Privacy Policy',
        }}
      />
      <Stack.Screen
        name="terms"
        options={{
          headerShown: false,
          title: 'Terms & Conditions',
        }}
      />
      <Stack.Screen
        name="shipping"
        options={{
          headerShown: false,
          title: 'Shipping & Delivery Policy',
        }}
      />
      <Stack.Screen
        name="refund"
        options={{
          headerShown: false,
          title: 'Return & Cancellation Policy',
        }}
      />
    </Stack>
  );
} 