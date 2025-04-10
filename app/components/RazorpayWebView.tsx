import React from 'react';
import { Modal } from 'react-native';
import WebView from 'react-native-webview';
import { apiService } from '../services/api';

interface RazorpayWebViewProps {
  isVisible: boolean;
  onClose: () => void;
  options: any;
  orderId: string;
  onPaymentSuccess: (data: any) => void;
  onPaymentError: (error: any) => void;
}

const RazorpayWebView: React.FC<RazorpayWebViewProps> = ({
  isVisible,
  onClose,
  options,
  orderId,
  onPaymentSuccess,
  onPaymentError,
}) => {
  const handlePaymentCancellation = async () => {
    try {
      // Call the cancel-payment endpoint
      await apiService.post(`/orders/${orderId}/cancel-payment`, {});
      onClose();
    } catch (error) {
      console.error('Error cancelling payment:', error);
      onPaymentError(error);
    }
  };

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
    </head>
    <body style="display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
      <div id="payment-button"></div>
      <script>
        const options = ${JSON.stringify(options)};
        options.handler = function(response) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'payment_success',
            data: response
          }));
        };
        options.modal = {
          ondismiss: function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'payment_cancelled'
            }));
          }
        };
        const rzp = new Razorpay(options);
        rzp.open();
      </script>
    </body>
    </html>
  `;

  const handleMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'payment_success') {
        onPaymentSuccess(data.data);
      } else if (data.type === 'payment_cancelled') {
        await handlePaymentCancellation();
      }
    } catch (error) {
      onPaymentError(error);
    }
  };

  return (
    <Modal visible={isVisible} animationType="slide" transparent={true} onRequestClose={handlePaymentCancellation}>
      <WebView
        source={{ html: htmlContent }}
        onMessage={handleMessage}
        style={{ flex: 1 }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />
    </Modal>
  );
};

export default RazorpayWebView; 