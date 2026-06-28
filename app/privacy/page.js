export const metadata = {
  title: 'Privacy Policy - TriggerDM',
  description: 'Privacy policy for TriggerDM',
}

export default function PrivacyPage() {
  return (
    <div className="page legal-page">
      <div className="page-header">
        <h1>Privacy Policy</h1>
      </div>

      <p className="hint">Last updated: June 28, 2026</p>

      <section>
        <h2>Overview</h2>
        <p>
          TriggerDM helps Instagram business accounts send direct messages in response to
          comments on selected reels. This policy explains what information the app uses
          and how it is stored.
        </p>
      </section>

      <section>
        <h2>Information We Use</h2>
        <p>
          The app uses Meta account identifiers, connected Page and Instagram business
          account IDs, access tokens, rule settings, comment event data, and delivery logs
          needed to run your automation rules.
        </p>
      </section>

      <section>
        <h2>How We Use Information</h2>
        <p>
          Information is used only to authenticate connected accounts, read eligible
          Instagram comments, match comments to your rules, send requested direct messages,
          and show account and rule status in the dashboard.
        </p>
      </section>

      <section>
        <h2>Storage</h2>
        <p>
          TriggerDM stores rule data, token records, and delivery logs in the Google Drive
          file configured by the app owner. The app does not sell personal data or use it
          for advertising.
        </p>
      </section>

      <section>
        <h2>Third Party Services</h2>
        <p>
          TriggerDM uses Meta APIs for Instagram and Facebook Page access, Google Drive for
          app storage, and Vercel for hosting. These services process data according to
          their own terms and privacy policies.
        </p>
      </section>

      <section>
        <h2>Deletion</h2>
        <p>
          You can remove app access from your Meta account settings and delete the
          configured Google Drive data file to remove stored app data. For help, contact
          the app owner.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Questions can be sent to <a href="mailto:almuwalladyousef@gmail.com">almuwalladyousef@gmail.com</a>.
        </p>
      </section>
    </div>
  )
}
