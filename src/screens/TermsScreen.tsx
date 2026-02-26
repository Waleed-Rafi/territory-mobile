import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { colors, spacing, typography } from "../theme";

export default function TermsScreen(): React.ReactElement {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Terms and Conditions</Text>
      <Text style={styles.updated}>Last updated: February 2025</Text>

      <Text style={styles.heading}>1. Acceptance of Terms</Text>
      <Text style={styles.body}>
        By downloading, installing, or using the Territory app ("App"), you agree to be bound by these Terms and
        Conditions ("Terms"). If you do not agree, do not use the App. We may update these Terms; your continued
        use after changes constitutes acceptance of the updated Terms.
      </Text>

      <Text style={styles.heading}>2. Description of Service</Text>
      <Text style={styles.body}>
        Territory is a running and fitness tracking application that allows you to record runs using GPS, view
        your activity on a map, set goals and reminders, and track progress. The App may display territory or
        gamification elements based on your runs. The service is provided "as is" and we do not guarantee
        uninterrupted or error-free operation.
      </Text>

      <Text style={styles.heading}>3. Account and Registration</Text>
      <Text style={styles.body}>
        You must create an account to use certain features. You agree to provide accurate information and to
        keep your account credentials secure. You are responsible for all activity under your account. You may
        deactivate your account from within the App; your data will be retained and you may reactivate by
        signing in again.
      </Text>

      <Text style={styles.heading}>4. Acceptable Use</Text>
      <Text style={styles.body}>
        You agree to use the App only for lawful purposes and in accordance with these Terms. You must not:
        misuse or attempt to gain unauthorized access to the App or others' accounts; use the App in any way
        that could harm, disable, or impair the service; use the App for any illegal or unauthorized purpose;
        or violate any applicable laws or regulations. We may suspend or terminate your access for violation
        of these terms.
      </Text>

      <Text style={styles.heading}>5. User Content and Data</Text>
      <Text style={styles.body}>
        You retain ownership of the data you provide (e.g. run data, profile information). By using the App,
        you grant us a limited license to store, process, and display your data to provide the service and to
        improve the App. We do not sell your personal data to third parties. Our use of your data is further
        described in our Privacy Policy (see About & Privacy screen).
      </Text>

      <Text style={styles.heading}>6. Health and Safety Disclaimer</Text>
      <Text style={styles.body}>
        The App is for informational and motivational purposes only. It is not a substitute for professional
        medical or fitness advice. Running and physical activity involve risk. You are solely responsible for
        your health and safety. Always consult a healthcare provider before starting or changing an exercise
        program. Use the App and run at your own risk.
      </Text>

      <Text style={styles.heading}>7. Disclaimer of Warranties</Text>
      <Text style={styles.body}>
        THE APP AND SERVICE ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS
        OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
        PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE APP WILL BE UNINTERRUPTED,
        SECURE, OR ERROR-FREE.
      </Text>

      <Text style={styles.heading}>8. Limitation of Liability</Text>
      <Text style={styles.body}>
        TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, WE (AND OUR AFFILIATES, OFFICERS, DIRECTORS,
        EMPLOYEES, AND AGENTS) SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
        PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR GOODWILL, ARISING OUT OF OR RELATED TO YOUR USE OF
        THE APP, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. OUR TOTAL LIABILITY SHALL NOT EXCEED THE
        AMOUNT YOU PAID TO US IN THE TWELVE MONTHS PRECEDING THE CLAIM, OR ONE HUNDRED DOLLARS, WHICHEVER IS
        LESS. SOME JURISDICTIONS DO NOT ALLOW CERTAIN LIMITATIONS; IN SUCH CASES OUR LIABILITY IS LIMITED TO
        THE MAXIMUM PERMITTED BY LAW.
      </Text>

      <Text style={styles.heading}>9. Indemnification</Text>
      <Text style={styles.body}>
        You agree to indemnify, defend, and hold harmless the App provider and its affiliates from and against
        any claims, damages, losses, liabilities, and expenses (including reasonable legal fees) arising from
        your use of the App, your violation of these Terms, or your violation of any rights of another.
      </Text>

      <Text style={styles.heading}>10. Termination</Text>
      <Text style={styles.body}>
        We may suspend or terminate your access to the App at any time for any reason, including violation of
        these Terms. You may stop using the App at any time and may deactivate your account. Provisions that
        by their nature should survive (e.g. disclaimers, limitation of liability, indemnification) will
        survive termination.
      </Text>

      <Text style={styles.heading}>11. Changes to Terms</Text>
      <Text style={styles.body}>
        We may modify these Terms from time to time. We will indicate the "Last updated" date at the top. Your
        continued use of the App after changes constitutes acceptance. If you do not agree to the new Terms,
        you must stop using the App and may deactivate your account.
      </Text>

      <Text style={styles.heading}>12. Governing Law</Text>
      <Text style={styles.body}>
        These Terms are governed by the laws of the jurisdiction in which the App provider is established,
        without regard to conflict of law principles. Any dispute shall be resolved in the courts of that
        jurisdiction, except where prohibited by law.
      </Text>

      <Text style={styles.heading}>13. Contact</Text>
      <Text style={styles.body}>
        For questions about these Terms and Conditions, please contact us through the contact information
        provided in the App Store or Play Store listing, or within the About & Privacy screen in the App.
      </Text>

      <View style={styles.footer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  title: {
    fontFamily: typography.display,
    fontSize: 22,
    fontWeight: "700",
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  updated: { fontSize: 12, color: colors.mutedForeground, marginBottom: spacing.xl },
  heading: {
    fontFamily: typography.display,
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  body: {
    fontSize: 14,
    color: colors.secondaryForeground,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  footer: { height: spacing.lg },
});
