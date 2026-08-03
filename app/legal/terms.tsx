import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TermsScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Terms & Conditions</Text>
          <Text style={styles.companySub}>Saranga Ayurveda LLP</Text>
          <Text style={styles.offerTag}>50% Launch Offer – Terms & Conditions</Text>
          <Text style={styles.effectiveDate}>Effective Date: 1 August 2027</Text>

          <Text style={styles.text}>
            Welcome to Saranga Ayurveda LLP. Our launch celebration is more than a sale—it marks the beginning of our commitment to bringing carefully crafted Ayurvedic products to every home. To make this possible, we are offering an exclusive 50% Launch Offer for a limited period.
          </Text>
          <Text style={styles.text}>
            As thousands of customers may participate in this campaign simultaneously, every order is manufactured, processed, packed, quality-checked, and dispatched through a carefully managed production schedule.
          </Text>
          <Text style={styles.text}>
            By placing an order on our website, you acknowledge that you have read, understood, and voluntarily agreed to all of the Terms & Conditions below. These Terms constitute a legally binding agreement between you and Saranga Ayurveda LLP.
          </Text>

          <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
          <Text style={styles.text}>
            By clicking “Place Order,” “Buy Now,” “Proceed to Payment,” or any similar purchase button, you expressly confirm that:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• You have read and accepted these Terms & Conditions.</Text>
            <Text style={styles.bulletItem}>• You voluntarily enter into this agreement.</Text>
            <Text style={styles.bulletItem}>• You understand the campaign conditions before making payment.</Text>
            <Text style={styles.bulletItem}>• Your acceptance is legally binding.</Text>
          </View>
          <Text style={styles.text}>
            If you do not agree with any part of these Terms, please do not place an order.
          </Text>

          <Text style={styles.sectionTitle}>2. Campaign Nature</Text>
          <Text style={styles.text}>
            The 50% Launch Offer is a limited promotional campaign. The Company reserves the sole right to modify, extend, shorten, suspend, discontinue, or withdraw the campaign at any time without prior notice.
          </Text>

          <Text style={styles.sectionTitle}>3. Prepaid Orders Only</Text>
          <Text style={styles.text}>
            All orders under this campaign are accepted strictly on a 100% prepaid basis. No Cash on Delivery (COD) orders will be accepted. Payment confirms your acceptance of all applicable policies.
          </Text>

          <Text style={styles.sectionTitle}>4. Manufacturing Timeline</Text>
          <Text style={styles.text}>
            Many products may be freshly manufactured or produced in batches after order confirmation to maintain quality standards. By placing an order, you expressly agree that:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• manufacturing may require additional time,</Text>
            <Text style={styles.bulletItem}>• products may not be shipped immediately,</Text>
            <Text style={styles.bulletItem}>• production schedules depend upon demand,</Text>
            <Text style={styles.bulletItem}>• dispatch dates may vary.</Text>
          </View>
          <Text style={styles.text}>
            Customers acknowledge that manufacturing timelines are an integral part of this promotional campaign.
          </Text>

          <Text style={styles.sectionTitle}>5. Dispatch & Delivery</Text>
          <Text style={styles.text}>
            Estimated delivery timelines displayed on the website are approximate and not guaranteed. Actual delivery may be affected by:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• high order volume,</Text>
            <Text style={styles.bulletItem}>• production schedules,</Text>
            <Text style={styles.bulletItem}>• courier delays,</Text>
            <Text style={styles.bulletItem}>• weather,</Text>
            <Text style={styles.bulletItem}>• transport issues,</Text>
            <Text style={styles.bulletItem}>• regulatory inspections,</Text>
            <Text style={styles.bulletItem}>• strikes,</Text>
            <Text style={styles.bulletItem}>• festivals,</Text>
            <Text style={styles.bulletItem}>• public holidays,</Text>
            <Text style={styles.bulletItem}>• natural disasters,</Text>
            <Text style={styles.bulletItem}>• government restrictions, or</Text>
            <Text style={styles.bulletItem}>• other circumstances beyond the Company’s reasonable control.</Text>
          </View>
          <Text style={styles.text}>
            The Company shall not be responsible for delays caused by such circumstances.
          </Text>

          <Text style={styles.sectionTitle}>6. No Cancellation After Confirmation</Text>
          <Text style={styles.text}>
            Once payment is successfully received, the order immediately enters production and processing. Accordingly:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• cancellation requests may not be accepted,</Text>
            <Text style={styles.bulletItem}>• modification requests may not be accepted,</Text>
            <Text style={styles.bulletItem}>• address changes may not always be possible,</Text>
            <Text style={styles.bulletItem}>• product changes may not always be possible.</Text>
          </View>

          <Text style={styles.sectionTitle}>7. Returns & Refunds</Text>
          <Text style={styles.text}>
            Products purchased under the 50% Launch Offer are promotional purchases. Unless required by applicable law, orders are not eligible for cancellation, exchange, or refund after processing. Refunds, if approved by the Company or required under applicable law, shall be processed only after verification.
          </Text>

          <Text style={styles.sectionTitle}>8. Product Availability</Text>
          <Text style={styles.text}>
            Products are offered subject to manufacturing capacity and ingredient availability. The Company reserves the right to:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• substitute packaging,</Text>
            <Text style={styles.bulletItem}>• revise product presentation,</Text>
            <Text style={styles.bulletItem}>• discontinue products,</Text>
            <Text style={styles.bulletItem}>• limit quantities, or</Text>
            <Text style={styles.bulletItem}>• cancel unavailable items.</Text>
          </View>
          <Text style={styles.text}>
            If a product cannot be supplied, the Company may provide an alternative remedy consistent with applicable law.
          </Text>

          <Text style={styles.sectionTitle}>9. Packaging Variations</Text>
          <Text style={styles.text}>
            Product appearance, labels, colour, fragrance, texture, or packaging may differ slightly from promotional images due to manufacturing improvements, photography, lighting, printing differences, or batch variations. Such differences shall not be considered defects.
          </Text>

          <Text style={styles.sectionTitle}>10. Customer Responsibility</Text>
          <Text style={styles.text}>
            Customers are responsible for providing:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• correct name,</Text>
            <Text style={styles.bulletItem}>• complete delivery address,</Text>
            <Text style={styles.bulletItem}>• valid contact details,</Text>
            <Text style={styles.bulletItem}>• accurate PIN code.</Text>
          </View>
          <Text style={styles.text}>
            The Company shall not be responsible for delays or additional charges arising from incorrect information provided by the customer.
          </Text>

          <Text style={styles.sectionTitle}>11. Limitation of Liability</Text>
          <Text style={styles.text}>
            To the maximum extent permitted by applicable law, Saranga Ayurveda LLP shall not be liable for any indirect, incidental, consequential, special, punitive, or exemplary damages, including loss of business, profits, goodwill, or opportunity, arising out of or relating to the use of its products, website, or promotional campaign. Nothing in these Terms excludes or limits liability that cannot lawfully be excluded under applicable law.
          </Text>

          <Text style={styles.sectionTitle}>12. Force Majeure</Text>
          <Text style={styles.text}>
            The Company shall not be liable for any delay or failure in performance caused by events beyond its reasonable control, including but not limited to:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• natural disasters,</Text>
            <Text style={styles.bulletItem}>• floods,</Text>
            <Text style={styles.bulletItem}>• fires,</Text>
            <Text style={styles.bulletItem}>• pandemics,</Text>
            <Text style={styles.bulletItem}>• war,</Text>
            <Text style={styles.bulletItem}>• civil disturbances,</Text>
            <Text style={styles.bulletItem}>• government actions,</Text>
            <Text style={styles.bulletItem}>• transport disruptions,</Text>
            <Text style={styles.bulletItem}>• labour shortages,</Text>
            <Text style={styles.bulletItem}>• power failures,</Text>
            <Text style={styles.bulletItem}>• internet failures, or</Text>
            <Text style={styles.bulletItem}>• interruptions in raw material supply.</Text>
          </View>
          <Text style={styles.text}>
            Performance obligations shall be suspended for the duration of such events.
          </Text>

          <Text style={styles.sectionTitle}>13. Intellectual Property</Text>
          <Text style={styles.text}>
            All website content, product names, branding, trademarks, images, videos, graphics, labels, logos, and promotional materials remain the exclusive property of Saranga Ayurveda LLP. No material may be copied, reproduced, or commercially used without prior written permission.
          </Text>

          <Text style={styles.sectionTitle}>14. Right to Refuse Orders</Text>
          <Text style={styles.text}>
            Saranga Ayurveda LLP reserves the right, acting reasonably, to refuse, limit, suspend, or cancel any order where it suspects fraud, abuse of the promotion, pricing errors, duplicate transactions, misuse of discount codes, or other violations of these Terms.
          </Text>

          <Text style={styles.sectionTitle}>15. Governing Law</Text>
          <Text style={styles.text}>
            These Terms shall be governed by the laws of India. Subject to applicable law, disputes shall be subject to the competent courts having jurisdiction at the Company’s registered office.
          </Text>

          <Text style={styles.sectionTitle}>16. Changes to Terms</Text>
          <Text style={styles.text}>
            The Company may amend these Terms & Conditions at any time. The version published on the website at the time of purchase shall govern that transaction unless otherwise required by law.
          </Text>

          <View style={styles.declarationBox}>
            <Text style={styles.declarationTitle}>Customer Declaration</Text>
            <Text style={styles.text}>
              By clicking “Place Order”, “Buy Now”, or “Proceed to Payment”, I confirm that:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• I have carefully read and understood all Terms & Conditions.</Text>
              <Text style={styles.bulletItem}>• I voluntarily agree to be legally bound by them.</Text>
              <Text style={styles.bulletItem}>• I understand that my order is prepaid.</Text>
              <Text style={styles.bulletItem}>• I understand that manufacturing, dispatch, and delivery timelines may vary.</Text>
              <Text style={styles.bulletItem}>• I understand that promotional orders are processed according to production capacity.</Text>
              <Text style={styles.bulletItem}>• I acknowledge that I am entering into a legally binding purchase agreement with Saranga Ayurveda LLP.</Text>
            </View>
          </View>

          <Text style={styles.thankYouText}>
            Thank you for supporting Saranga Ayurveda LLP and being part of our launch journey.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fbf7f4',
  },
  container: {
    flex: 1,
    backgroundColor: '#fbf7f4',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontFamily: 'CormorantGaramond-Bold',
    marginBottom: 4,
    color: '#2b3a1a',
    textAlign: 'center',
  },
  companySub: {
    fontSize: 15,
    fontWeight: '700',
    color: '#556C3A',
    textAlign: 'center',
    marginBottom: 4,
  },
  offerTag: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2b3a1a',
    textAlign: 'center',
    marginBottom: 4,
  },
  effectiveDate: {
    fontSize: 13,
    fontWeight: '600',
    color: '#556C3A',
    textAlign: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2b3a1a',
    marginTop: 18,
    marginBottom: 8,
  },
  text: {
    fontSize: 13,
    lineHeight: 20,
    color: '#333',
    marginBottom: 12,
  },
  bulletList: {
    paddingLeft: 8,
    marginBottom: 14,
  },
  bulletItem: {
    fontSize: 13,
    lineHeight: 20,
    color: '#333',
    marginBottom: 4,
  },
  declarationBox: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(43, 58, 26, 0.15)',
    marginTop: 20,
    marginBottom: 16,
  },
  declarationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2b3a1a',
    marginBottom: 10,
  },
  thankYouText: {
    fontSize: 14,
    fontStyle: 'italic',
    fontWeight: '600',
    color: '#2b3a1a',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 10,
  },
});