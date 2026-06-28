export const metadata = {
  title: 'Terms of Service - TriggerDM',
  description: 'Terms of service for TriggerDM',
}

export default function TermsPage() {
  return (
    <div className="page legal-page">
      <div className="page-header">
        <h1>Terms of Service</h1>
      </div>

      <p className="hint">Last updated: June 28, 2026</p>

      <section>
        <h2>Use of the Service</h2>
        <p>
          TriggerDM is provided to help the app owner automate Instagram comment-to-DM
          workflows for connected business accounts. You are responsible for using the
          service only with accounts you own or are authorized to manage.
        </p>
      </section>

      <section>
        <h2>Platform Rules</h2>
        <p>
          You must comply with Meta, Facebook, and Instagram platform policies, including
          messaging, automation, privacy, and anti-spam requirements. TriggerDM should not
          be used to send unwanted, misleading, or abusive messages.
        </p>
      </section>

      <section>
        <h2>Your Content</h2>
        <p>
          You are responsible for rule keywords, message text, and any content sent through
          connected accounts. You retain responsibility for ensuring messages are accurate,
          lawful, and permitted by the destination platform.
        </p>
      </section>

      <section>
        <h2>Availability</h2>
        <p>
          The service depends on third-party APIs and hosting providers. It is provided as
          is, without a guarantee that every comment event, message, or token refresh will
          succeed.
        </p>
      </section>

      <section>
        <h2>Limitation of Liability</h2>
        <p>
          To the maximum extent allowed by law, TriggerDM and its operator are not liable
          for indirect, incidental, or consequential damages from use of the service,
          including missed messages, failed automation, account restrictions, or lost
          business.
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
