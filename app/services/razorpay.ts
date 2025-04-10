import { Alert } from 'react-native';
import { apiService } from './api';

interface RazorpayOrderResponse {
  order: {
    id: string;
    razorpay_order: {
      id: string;
      amount: number;
      currency: string;
      key: string;
    };
  };
}

export const initializeRazorpayPayment = async (orderData: any) => {
  try {
    // Create order in your backend
    const response = await apiService.post<RazorpayOrderResponse>('/orders', orderData);
    
    if (!response.data?.order || !response.data.order.razorpay_order) {
      throw new Error('Failed to create order');
    }

    const { id: orderId, razorpay_order } = response.data.order;

    // Load the Razorpay SDK
    const options = {
      key: razorpay_order.key,
      amount: razorpay_order.amount,
      currency: razorpay_order.currency,
      name: 'Saranga Ayurveda',
      description: `Order #${orderId}`,
      order_id: razorpay_order.id,
      prefill: {
        name: orderData.shipping_address.full_name,
        contact: orderData.shipping_address.phone_number,
      },
      theme: {
        color: '#FF69B4'
      }
    };

    return { options, orderId };
  } catch (error: any) {
    console.error('Error initializing Razorpay payment:', error);
    throw new Error(error.message || 'Failed to initialize payment');
  }
}; 