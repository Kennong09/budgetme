import React, { FC, FormEvent } from 'react';

interface EmailModalProps {
  show: boolean;
  emailRecipient: string;
  emailSubject: string;
  emailMessage: string;
  emailSending: boolean;
  onEmailRecipientChange: (value: string) => void;
  onEmailSubjectChange: (value: string) => void;
  onEmailMessageChange: (value: string) => void;
  onSubmit: (e: FormEvent) => Promise<void>;
  onClose: () => void;
}

const EmailModal: FC<EmailModalProps> = ({
  show,
  emailRecipient,
  emailSubject,
  emailMessage,
  emailSending,
  onEmailRecipientChange,
  onEmailSubjectChange,
  onEmailMessageChange,
  onSubmit,
  onClose
}) => {
  if (!show) return null;

  return (
    <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Email Financial Report</h5>
            <button type="button" className="close" onClick={onClose}>
              <span>&times;</span>
            </button>
          </div>
          <form onSubmit={onSubmit}>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="emailRecipient">Recipient Email</label>
                <input
                  type="email"
                  className="form-control"
                  id="emailRecipient"
                  value={emailRecipient}
                  onChange={(e) => onEmailRecipientChange(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="emailSubject">Subject</label>
                <input
                  type="text"
                  className="form-control"
                  id="emailSubject"
                  value={emailSubject}
                  onChange={(e) => onEmailSubjectChange(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="emailMessage">Message</label>
                <textarea
                  className="form-control"
                  id="emailMessage"
                  rows={3}
                  value={emailMessage}
                  onChange={(e) => onEmailMessageChange(e.target.value)}
                ></textarea>
              </div>
              <div className="form-group mb-0">
                <div className="custom-control custom-checkbox">
                  <input type="checkbox" className="custom-control-input" id="attachPDF" defaultChecked />
                  <label className="custom-control-label" htmlFor="attachPDF">
                    Attach report as PDF
                  </label>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={emailSending}>
                {emailSending ? (
                  <>
                    <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>
                    Sending...
                  </>
                ) : 'Send Email'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EmailModal;