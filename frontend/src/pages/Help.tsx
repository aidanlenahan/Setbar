import './Help.css'

export default function Help() {
  return (
    <div className="help-page">
      <div className="help-card">
        <h1>Help and Feedback</h1>

        <div className="help-section">
          <h2>Contact support</h2>
          <p>Email us anytime and we will get back to you as soon as possible.</p>
          <a className="help-link" href="mailto:help@ness.aidanlenahan.com">
            help@ness.aidanlenahan.com
          </a>
        </div>

        <div className="help-section">
          <h2>Send feedback</h2>
          <p>
            Share ideas, report issues, or request features using our{' '}
            <a
              className="help-link-inline"
              href="https://forms.gle/AJgV6k8qtLqRp5Ap6"
              target="_blank"
              rel="noopener noreferrer"
            >
              feedback form
            </a>.
          </p>
        </div>
      </div>
    </div>
  )
}
