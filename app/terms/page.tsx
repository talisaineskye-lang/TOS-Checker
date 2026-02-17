import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms and conditions for using the StackDrift vendor monitoring service.',
};

export default function TermsOfServicePage() {
  return (
    <main className="legal-page">
      <div className="legal-container">
        <header className="legal-header">
          <span className="legal-label">LEGAL</span>
          <h1 className="legal-title">Terms of Service</h1>
          <p className="legal-effective">Effective Date: February 17, 2026</p>
        </header>

        <nav className="legal-toc">
          <span className="legal-toc-label">ON THIS PAGE</span>
          <ol>
            <li><a href="#acceptance">Acceptance of Terms</a></li>
            <li><a href="#service-description">Service Description</a></li>
            <li><a href="#accounts">Accounts &amp; Registration</a></li>
            <li><a href="#subscriptions">Subscriptions &amp; Billing</a></li>
            <li><a href="#free-tier">Free Tier &amp; Newsletter</a></li>
            <li><a href="#acceptable-use">Acceptable Use</a></li>
            <li><a href="#intellectual-property">Intellectual Property</a></li>
            <li><a href="#api-usage">API &amp; Webhook Usage</a></li>
            <li><a href="#data-accuracy">Data Accuracy &amp; Disclaimers</a></li>
            <li><a href="#limitation">Limitation of Liability</a></li>
            <li><a href="#indemnification">Indemnification</a></li>
            <li><a href="#termination">Termination</a></li>
            <li><a href="#governing-law">Governing Law</a></li>
            <li><a href="#changes">Changes to These Terms</a></li>
            <li><a href="#contact">Contact Us</a></li>
          </ol>
        </nav>

        <article className="legal-content">
          <section id="acceptance">
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing or using StackDrift (&ldquo;the Service&rdquo;), operated at{' '}
              <a href="https://www.stackdrift.app">www.stackdrift.app</a>, you agree to be bound by
              these Terms of Service (&ldquo;Terms&rdquo;). If you do not agree to these Terms, you
              may not use the Service.
            </p>
            <p>
              These Terms constitute a legal agreement between you (&ldquo;User,&rdquo;
              &ldquo;you,&rdquo; or &ldquo;your&rdquo;) and StackDrift (&ldquo;we,&rdquo;
              &ldquo;us,&rdquo; or &ldquo;our&rdquo;).
            </p>
          </section>

          <section id="service-description">
            <h2>2. Service Description</h2>
            <p>
              StackDrift is a vendor monitoring service that tracks changes to Terms of Service,
              privacy policies, and pricing pages for SaaS platforms. The Service provides:
            </p>
            <ul>
              <li>Automated monitoring and change detection for vendor policy documents</li>
              <li>AI-powered analysis of policy changes with risk classification</li>
              <li>Email alerts and notifications when changes are detected</li>
              <li>A curated industry news feed (Drift Intel)</li>
              <li>Personalized weekly digests for paid subscribers</li>
              <li>API access and webhook integrations for qualifying subscription tiers</li>
            </ul>
          </section>

          <section id="accounts">
            <h2>3. Accounts &amp; Registration</h2>
            <p>
              To access certain features, you must create an account using GitHub OAuth, Google
              OAuth, or magic link (passwordless email) authentication.
            </p>
            <p>You agree to:</p>
            <ul>
              <li>Provide accurate and current information during registration</li>
              <li>Maintain the security of your account credentials</li>
              <li>Notify us immediately of any unauthorized access to your account</li>
              <li>Accept responsibility for all activity that occurs under your account</li>
            </ul>
            <p>
              We reserve the right to suspend or terminate accounts that violate these Terms or
              that we reasonably believe are being used fraudulently.
            </p>
          </section>

          <section id="subscriptions">
            <h2>4. Subscriptions &amp; Billing</h2>

            <h3>4.1 Plans</h3>
            <p>StackDrift offers three paid subscription tiers:</p>
            <div className="legal-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Plan</th>
                    <th>Price</th>
                    <th>Key Features</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Solo</td>
                    <td>$9/month</td>
                    <td>Basic monitoring, personalized weekly digest</td>
                  </tr>
                  <tr>
                    <td>Pro</td>
                    <td>$29/month</td>
                    <td>Webhooks, API access, real-time alerts</td>
                  </tr>
                  <tr>
                    <td>Business</td>
                    <td>$99/month</td>
                    <td>Compliance features, team accounts, priority support</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              Annual billing is available at a discounted rate. Prices are in USD and do not include
              applicable taxes.
            </p>

            <h3>4.2 Payment &amp; Renewal</h3>
            <p>
              Payments are processed securely through Stripe. Subscriptions renew automatically at
              the end of each billing cycle unless cancelled. You may cancel at any time from your
              account settings; cancellation takes effect at the end of the current billing period.
            </p>

            <h3>4.3 Refunds</h3>
            <p>
              We do not offer refunds for partial billing periods. If you cancel your subscription,
              you will retain access to paid features until the end of your current billing cycle.
              In exceptional circumstances, refund requests can be directed to{' '}
              <a href="mailto:support@stackdrift.app">support@stackdrift.app</a>.
            </p>
          </section>

          <section id="free-tier">
            <h2>5. Free Tier &amp; Newsletter</h2>
            <p>
              StackDrift offers a free weekly newsletter (Drift Intel) that provides curated
              industry news. The free newsletter is a broadcast product and does not include
              personalized monitoring or alerts. Access to the dashboard, personalized digests, API,
              and webhooks requires a paid subscription.
            </p>
          </section>

          <section id="acceptable-use">
            <h2>6. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Use the Service for any unlawful purpose or in violation of any applicable laws</li>
              <li>
                Attempt to gain unauthorized access to our systems, other users&rsquo; accounts, or
                any data not intended for you
              </li>
              <li>
                Use automated scripts, bots, or scrapers to access the Service outside of our
                provided API
              </li>
              <li>
                Resell, redistribute, or sublicense access to the Service or its data without
                written permission
              </li>
              <li>
                Interfere with or disrupt the Service, servers, or networks connected to the Service
              </li>
              <li>
                Use the Service to monitor vendors for the purpose of competitive harm or
                harassment
              </li>
            </ul>
          </section>

          <section id="intellectual-property">
            <h2>7. Intellectual Property</h2>
            <p>
              The StackDrift name, logo, website design, original content, AI analysis outputs, and
              underlying code are the intellectual property of StackDrift. You may not copy,
              reproduce, modify, or create derivative works from our materials without prior
              written consent.
            </p>
            <p>
              The vendor policy documents and pricing pages monitored by StackDrift are the
              intellectual property of their respective owners. StackDrift provides change summaries
              and analysis as a monitoring tool; we do not claim ownership of third-party content.
            </p>
          </section>

          <section id="api-usage">
            <h2>8. API &amp; Webhook Usage</h2>
            <p>
              API access and webhook integrations are available to Pro and Business subscribers.
              You agree to:
            </p>
            <ul>
              <li>Use API keys responsibly and keep them confidential</li>
              <li>Respect rate limits as documented in our API documentation</li>
              <li>
                Not use API access to build a competing service or to bulk-redistribute our data
              </li>
            </ul>
            <p>
              We reserve the right to revoke API access if usage patterns indicate abuse or
              violation of these Terms.
            </p>
          </section>

          <section id="data-accuracy">
            <h2>9. Data Accuracy &amp; Disclaimers</h2>
            <p>
              StackDrift uses automated systems and AI to detect and analyze changes to vendor
              policies. While we strive for accuracy:
            </p>
            <ul>
              <li>
                <strong>No guarantee of completeness:</strong> We may not detect every change to
                every monitored document at all times. Website structures change, and some updates
                may be missed.
              </li>
              <li>
                <strong>AI analysis is informational:</strong> Our AI-generated summaries and risk
                assessments are for informational purposes only and do not constitute legal advice.
              </li>
              <li>
                <strong>Not a substitute for legal counsel:</strong> You should consult a qualified
                legal professional for decisions regarding compliance, contracts, or policy changes.
              </li>
            </ul>
            <p>
              THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT
              WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
              IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
              NON-INFRINGEMENT.
            </p>
          </section>

          <section id="limitation">
            <h2>10. Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, STACKDRIFT AND ITS OPERATORS
              SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE
              DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, BUSINESS OPPORTUNITIES,
              OR GOODWILL, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE.
            </p>
            <p>
              OUR TOTAL LIABILITY FOR ANY CLAIMS ARISING FROM YOUR USE OF THE SERVICE SHALL NOT
              EXCEED THE AMOUNT YOU HAVE PAID TO US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
            </p>
          </section>

          <section id="indemnification">
            <h2>11. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless StackDrift, its operators, and affiliates
              from any claims, damages, losses, or expenses (including reasonable legal fees)
              arising from your use of the Service, violation of these Terms, or infringement of
              any third-party rights.
            </p>
          </section>

          <section id="termination">
            <h2>12. Termination</h2>
            <p>
              You may terminate your account at any time through your account settings or by
              contacting us. We may suspend or terminate your access if you violate these Terms,
              with or without notice.
            </p>
            <p>
              Upon termination, your right to use the Service ceases immediately. Sections relating
              to intellectual property, limitation of liability, indemnification, and governing law
              survive termination.
            </p>
          </section>

          <section id="governing-law">
            <h2>13. Governing Law</h2>
            <p>
              These Terms are governed by and construed in accordance with the laws of the Province
              of Alberta and the federal laws of Canada applicable therein, without regard to
              conflict of law principles. Any disputes arising under these Terms shall be subject to
              the exclusive jurisdiction of the courts of Alberta, Canada.
            </p>
          </section>

          <section id="changes">
            <h2>14. Changes to These Terms</h2>
            <p>
              We reserve the right to update these Terms at any time. We will provide notice of
              material changes via email or a prominent notice on the Service. Continued use of
              the Service after changes take effect constitutes acceptance of the revised Terms.
            </p>
            <p>
              We encourage you to review these Terms periodically. Given that StackDrift is a
              service dedicated to tracking policy changes, we hold ourselves to the same standard
              of transparency we expect from the vendors we monitor.
            </p>
          </section>

          <section id="contact">
            <h2>15. Contact Us</h2>
            <p>
              If you have questions about these Terms or need support, please contact us:
            </p>
            <p>
              <strong>Email:</strong>{' '}
              <a href="mailto:support@stackdrift.app">support@stackdrift.app</a>
              <br />
              <strong>Website:</strong>{' '}
              <a href="https://www.stackdrift.app">www.stackdrift.app</a>
            </p>
          </section>
        </article>

        <footer className="legal-footer">
          <p>&copy; {new Date().getFullYear()} StackDrift. All rights reserved.</p>
          <div className="legal-footer-links">
            <a href="/terms">Terms of Service</a>
            <a href="/privacy">Privacy Policy</a>
          </div>
        </footer>
      </div>
    </main>
  );
}
