import React from 'react';
import { Modal, Platform, StyleSheet, StatusBar } from 'react-native';
import WebView from 'react-native-webview';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
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
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          width: 100vw;
          margin: 0;
          padding: 0;
          overflow: hidden;
          background-color: #ffffff;
        }
        #payment-button {
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
        }
      </style>
      <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
    </head>
    <body>
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
    <Modal 
      visible={isVisible} 
      animationType="slide" 
      transparent={false} 
      onRequestClose={handlePaymentCancellation}
      statusBarTranslucent={true}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <StatusBar 
          barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'} 
          translucent={false}
          backgroundColor="#ffffff"
        />
        <WebView
          source={{ html: htmlContent }}
          onMessage={handleMessage}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          scalesPageToFit={true}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          startInLoadingState={true}
          androidHardwareAccelerationDisabled={false}
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webview: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});

export default RazorpayWebView; 