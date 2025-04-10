import { Stack } from 'expo-router';

export default function LegalLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="privacy-policy"
        options={{
          headerShown: true,
          title: 'Privacy Policy',
        }}
      />
      <Stack.Screen
        name="terms"
        options={{
          headerShown: true,
          title: 'Terms of Service',
        }}
      />
      <Stack.Screen
        name="shipping"
        options={{
          headerShown: true,
          title: 'Shipping Policy',
        }}
      />
      <Stack.Screen
        name="refund"
        options={{
          headerShown: true,
          title: 'Refund Policy',
        }}
      />
    </Stack>
  );
} 