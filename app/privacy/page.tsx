import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — StackDrift',
  description: 'How StackDrift collects, uses, and protects your personal information.',
};

export default function PrivacyPolicyPage() {
  return (
    <main className="legal-page">
      <div className="legal-container">
        <header className="legal-header">
          <span className="legal-label">LEGAL</span>
          <h1 className="legal-title">Privacy Policy</h1>
          <p className="legal-effective">Effective Date: February 17, 2026</p>
        </header>

        <nav className="legal-toc">
          <span className="legal-toc-label">ON THIS PAGE</span>
          <ol>
            <li><a href="#overview">Overview</a></li>
            <li><a href="#information-we-collect">Information We Collect</a></li>
            <li><a href="#how-we-use">How We Use Your Information</a></li>
            <li><a href="#third-party-services">Third-Party Services</a></li>
            <li><a href="#data-storage">Data Storage &amp; Security</a></li>
            <li><a href="#data-retention">Data Retention</a></li>
            <li><a href="#your-rights">Your Rights</a></li>
            <li><a href="#pipeda">PIPEDA Compliance (Canada)</a></li>
            <li><a href="#gdpr">GDPR Compliance (EU/EEA)</a></li>
            <li><a href="#cookies">Cookies &amp; Analytics</a></li>
            <li><a href="#children">Children&rsquo;s Privacy</a></li>
            <li><a href="#changes">Changes to This Policy</a></li>
            <li><a href="#contact">Contact Us</a></li>
          </ol>
        </nav>

        <article className="legal-content">
          <section id="overview">
            <h2>1. Overview</h2>
            <p>
              StackDrift (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) operates the website{' '}
              <a href="https://www.stackdrift.app">www.stackdrift.app</a> and provides a vendor
              monitoring service that tracks changes to Terms of Service, privacy policies, and
              pricing pages for SaaS platforms. This Privacy Policy explains how we collect, use,
              disclose, and protect your personal information when you use our website and services.
            </p>
            <p>
              StackDrift is operated from Alberta, Canada, and is subject to Canadian federal
              privacy legislation, including the Personal Information Protection and Electronic
              Documents Act (PIPEDA).
            </p>
          </section>

          <section id="information-we-collect">
            <h2>2. Information We Collect</h2>

            <h3>2.1 Information You Provide</h3>
            <ul>
              <li>
                <strong>Account Information:</strong> When you create an account, we collect your
                email address, display name, and avatar image via OAuth providers (GitHub, Google)
                or magic link authentication.
              </li>
              <li>
                <strong>Vendor Selections:</strong> The vendors and SaaS platforms you choose to
                monitor through your watchlist.
              </li>
              <li>
                <strong>Newsletter Subscription:</strong> Your email address when you subscribe to
                the Drift Intel newsletter.
              </li>
              <li>
                <strong>Billing Information:</strong> Payment details processed securely through
                Stripe. We do not store your full credit card number on our servers.
              </li>
            </ul>

            <h3>2.2 Information Collected Automatically</h3>
            <ul>
              <li>
                <strong>Usage Data:</strong> Pages visited, features used, timestamps of activity,
                and interaction patterns with alerts and reports.
              </li>
              <li>
                <strong>Device &amp; Browser Information:</strong> Browser type, operating system,
                screen resolution, and language preferences.
              </li>
              <li>
                <strong>IP Address:</strong> Collected for security purposes and approximate
                geolocation.
              </li>
            </ul>
          </section>

          <section id="how-we-use">
            <h2>3. How We Use Your Information</h2>
            <p>We use your personal information to:</p>
            <ul>
              <li>Provide and maintain the StackDrift monitoring service</li>
              <li>Send alerts when your monitored vendors update their policies or pricing</li>
              <li>Deliver the Drift Intel newsletter and personalized weekly digests</li>
              <li>Process subscription payments and manage your billing</li>
              <li>Improve our service through aggregated, anonymized usage analytics</li>
              <li>Communicate service updates, security notices, and support responses</li>
              <li>Detect and prevent fraud, abuse, or security incidents</li>
            </ul>
            <p>
              We will not sell, rent, or trade your personal information to third parties for
              marketing purposes.
            </p>
          </section>

          <section id="third-party-services">
            <h2>4. Third-Party Services</h2>
            <p>
              StackDrift relies on the following third-party service providers to operate. Each
              provider has their own privacy policy governing their use of your data:
            </p>
            <div className="legal-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Purpose</th>
                    <th>Data Shared</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Supabase</td>
                    <td>Database, authentication</td>
                    <td>Account info, vendor selections, usage data</td>
                  </tr>
                  <tr>
                    <td>Vercel</td>
                    <td>Hosting, serverless functions</td>
                    <td>IP address, request logs</td>
                  </tr>
                  <tr>
                    <td>Stripe</td>
                    <td>Payment processing</td>
                    <td>Billing &amp; payment information</td>
                  </tr>
                  <tr>
                    <td>Resend</td>
                    <td>Transactional email delivery</td>
                    <td>Email address, alert content</td>
                  </tr>
                  <tr>
                    <td>Beehiiv</td>
                    <td>Newsletter platform</td>
                    <td>Email address, subscription preferences</td>
                  </tr>
                  <tr>
                    <td>Anthropic</td>
                    <td>AI-powered policy analysis</td>
                    <td>Vendor policy text (no personal data)</td>
                  </tr>
                  <tr>
                    <td>GitHub / Google</td>
                    <td>OAuth authentication</td>
                    <td>Profile info (name, email, avatar)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section id="data-storage">
            <h2>5. Data Storage &amp; Security</h2>
            <p>
              Your data is stored securely via Supabase (hosted on AWS infrastructure). We implement
              Row-Level Security (RLS) policies to ensure users can only access their own data. All
              data is encrypted in transit via TLS and at rest via AES-256 encryption.
            </p>
            <p>
              While we take reasonable measures to protect your information, no method of
              transmission over the Internet or electronic storage is 100% secure. We cannot
              guarantee absolute security.
            </p>
          </section>

          <section id="data-retention">
            <h2>6. Data Retention</h2>
            <p>
              We retain your personal information for as long as your account is active or as needed
              to provide you with our services. If you delete your account, we will remove your
              personal data within 30 days, except where we are required by law to retain it.
            </p>
            <p>
              Anonymized, aggregated data (such as usage statistics) may be retained indefinitely
              as it cannot be used to identify you.
            </p>
          </section>

          <section id="your-rights">
            <h2>7. Your Rights</h2>
            <p>Depending on your jurisdiction, you may have the right to:</p>
            <ul>
              <li>Access the personal information we hold about you</li>
              <li>Correct inaccurate or incomplete information</li>
              <li>Request deletion of your personal data</li>
              <li>Withdraw consent for data processing</li>
              <li>Export your data in a portable format</li>
              <li>Object to or restrict certain processing activities</li>
            </ul>
            <p>
              To exercise any of these rights, contact us at{' '}
              <a href="mailto:privacy@stackdrift.app">privacy@stackdrift.app</a>. We will respond
              within 30 days.
            </p>
          </section>

          <section id="pipeda">
            <h2>8. PIPEDA Compliance (Canada)</h2>
            <p>
              As a Canadian-operated service, StackDrift complies with the Personal Information
              Protection and Electronic Documents Act (PIPEDA). In accordance with PIPEDA&rsquo;s
              ten fair information principles:
            </p>
            <ul>
              <li>
                <strong>Accountability:</strong> We are responsible for personal information under
                our control and have designated a privacy contact to oversee compliance.
              </li>
              <li>
                <strong>Identifying Purposes:</strong> We identify the purposes for collecting
                personal information at or before the time of collection, as described in this
                policy.
              </li>
              <li>
                <strong>Consent:</strong> We obtain your meaningful consent for the collection, use,
                and disclosure of your personal information. You may withdraw consent at any time by
                contacting us or deleting your account.
              </li>
              <li>
                <strong>Limiting Collection:</strong> We collect only the personal information
                necessary to fulfill the purposes identified.
              </li>
              <li>
                <strong>Limiting Use, Disclosure, and Retention:</strong> Personal information is
                used only for the purposes for which it was collected, and retained only as long as
                necessary.
              </li>
              <li>
                <strong>Accuracy:</strong> We keep personal information as accurate and up-to-date
                as necessary for its intended purposes.
              </li>
              <li>
                <strong>Safeguards:</strong> We protect personal information with security measures
                appropriate to the sensitivity of the data.
              </li>
              <li>
                <strong>Openness:</strong> This privacy policy makes our data practices readily
                available to you.
              </li>
              <li>
                <strong>Individual Access:</strong> Upon request, we will inform you of the
                existence, use, and disclosure of your personal information and provide access to it.
              </li>
              <li>
                <strong>Challenging Compliance:</strong> You may challenge our compliance with these
                principles by contacting our privacy contact.
              </li>
            </ul>
            <p>
              If you are unsatisfied with our response, you may file a complaint with the{' '}
              <a href="https://www.priv.gc.ca" target="_blank" rel="noopener noreferrer">
                Office of the Privacy Commissioner of Canada
              </a>.
            </p>
          </section>

          <section id="gdpr">
            <h2>9. GDPR Compliance (EU/EEA)</h2>
            <p>
              If you are located in the European Economic Area (EEA), the legal bases for processing
              your personal data include:
            </p>
            <ul>
              <li>
                <strong>Contract Performance:</strong> Processing necessary to provide you with the
                StackDrift service.
              </li>
              <li>
                <strong>Legitimate Interest:</strong> Processing for service improvement, fraud
                prevention, and security.
              </li>
              <li>
                <strong>Consent:</strong> Where you have given explicit consent, such as subscribing
                to our newsletter.
              </li>
            </ul>
            <p>
              You have additional rights under GDPR, including the right to data portability, the
              right to be forgotten, and the right to lodge a complaint with your local supervisory
              authority.
            </p>
          </section>

          <section id="cookies">
            <h2>10. Cookies &amp; Analytics</h2>
            <p>
              StackDrift uses essential cookies required for authentication and session management.
              We may use analytics tools to understand how our service is used. We do not use
              advertising cookies or trackers.
            </p>
            <div className="legal-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Cookie Type</th>
                    <th>Purpose</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Authentication</td>
                    <td>Session management via Supabase Auth</td>
                    <td>Session / 7 days</td>
                  </tr>
                  <tr>
                    <td>Preferences</td>
                    <td>Theme, dismissed notices</td>
                    <td>1 year</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section id="children">
            <h2>11. Children&rsquo;s Privacy</h2>
            <p>
              StackDrift is not directed at individuals under the age of 16. We do not knowingly
              collect personal information from children. If we become aware that we have collected
              data from a child without parental consent, we will take steps to delete that
              information promptly.
            </p>
          </section>

          <section id="changes">
            <h2>12. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of material
              changes by posting a notice on our website or sending an email to registered users.
              Your continued use of StackDrift after changes are posted constitutes acceptance of
              the updated policy.
            </p>
          </section>

          <section id="contact">
            <h2>13. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy, your personal information, or wish to
              exercise your privacy rights, please contact us:
            </p>
            <p>
              <strong>Email:</strong>{' '}
              <a href="mailto:privacy@stackdrift.app">privacy@stackdrift.app</a>
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
