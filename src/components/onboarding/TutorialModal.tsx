import React, { FC, useState } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '../../utils/OnboardingContext';
import './onboarding.css';

interface TutorialModalProps {
  onStartTutorial: () => void;
  onSkipTutorial: () => void;
}

const TutorialModal: FC<TutorialModalProps> = ({ onStartTutorial, onSkipTutorial }) => {
  const [showModal, setShowModal] = useState<boolean>(true);

  const handleClose = () => {
    setShowModal(false);
    onSkipTutorial();
  };

  const handleStartTutorial = () => {
    setShowModal(false);
    onStartTutorial();
  };

  return (
    <Modal 
      show={showModal} 
      onHide={handleClose}
      centered
      backdrop="static"
      keyboard={false}
      className="tutorial-modal"
    >
      <Modal.Header>
        <Modal.Title className="w-100 text-center">
          <i className="fas fa-rocket text-primary mr-2"></i>
          Welcome to BudgetMe!
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <div className="text-center mb-4">
          <p className="welcome-text">
            Let's take a quick tour to help you get started and make the most of your personal finance journey.
          </p>

          <div className="tutorial-features">
            <div className="feature-item">
              <div className="feature-icon">
                <i className="fas fa-tachometer-alt"></i>
              </div>
              <div className="feature-text">
                <h5>Dashboard</h5>
                <p>See your financial overview</p>
              </div>
            </div>
            
            <div className="feature-item">
              <div className="feature-icon">
                <i className="fas fa-wallet"></i>
              </div>
              <div className="feature-text">
                <h5>Budgets</h5>
                <p>Create spending plans</p>
              </div>
            </div>
            
            <div className="feature-item">
              <div className="feature-icon">
                <i className="fas fa-bullseye"></i>
              </div>
              <div className="feature-text">
                <h5>Goals</h5>
                <p>Set and track financial goals</p>
              </div>
            </div>
            
            <div className="feature-item">
              <div className="feature-icon">
                <i className="fas fa-exchange-alt"></i>
              </div>
              <div className="feature-text">
                <h5>Transactions</h5>
                <p>Record income and expenses</p>
              </div>
            </div>
          </div>
        </div>
      </Modal.Body>

      <Modal.Footer className="justify-content-center">
        <Button 
          variant="outline-secondary" 
          onClick={handleClose}
          className="tutorial-btn"
        >
          Skip Tutorial
        </Button>
        <Button 
          variant="primary" 
          onClick={handleStartTutorial}
          className="tutorial-btn"
        >
          Start Tutorial
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default TutorialModal; 