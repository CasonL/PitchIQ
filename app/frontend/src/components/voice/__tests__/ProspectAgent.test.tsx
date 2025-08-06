import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProspectAgent from '../ProspectAgent';
import { useCallController } from '../CallController';
import { VoiceSelector } from '../VoiceSelector';

// Mock the modules
jest.mock('../CallController', () => ({
  useCallController: jest.fn()
}));

jest.mock('../VoiceSelector', () => ({
  VoiceSelector: {
    selectVoiceForPersona: jest.fn()
  }
}));

describe('ProspectAgent Component', () => {
  // Sample persona for testing
  const mockPersona = {
    name: 'John Smith',
    role: 'CTO',
    company: 'Tech Corp',
    personality_traits: ['curious', 'thoughtful', 'direct'],
    description: 'A technical decision maker',
    gender: 'male'
  };

  // Default mock implementation for useCallController
  const mockUseCallController = {
    state: {
      status: 'idle',
      activeSessionId: null,
      persona: mockPersona,
      callDuration: 0,
      lastError: null,
      transcript: '',
      currentSentence: '',
      isPlayingSentence: false,
      reconnectAttempts: 0,
      selectedVoice: 'aura-2-blaze-en'
    },
    startCall: jest.fn(),
    endCall: jest.fn(),
    cleanup: jest.fn(),
    isConnected: false,
    isConnecting: false,
    callDuration: 0,
    transcript: '',
    error: null
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useCallController as jest.Mock).mockReturnValue(mockUseCallController);
    (VoiceSelector.selectVoiceForPersona as jest.Mock).mockReturnValue('aura-2-blaze-en');
  });

  test('renders with persona information', () => {
    render(<ProspectAgent persona={mockPersona} />);
    
    expect(screen.getByText('John Smith - CTO')).toBeInTheDocument();
    expect(screen.getByText('Company: Tech Corp')).toBeInTheDocument();
    expect(screen.getByText('Voice: aura-2-blaze-en')).toBeInTheDocument();
  });

  test('shows Start Call button when not connected', () => {
    render(<ProspectAgent persona={mockPersona} />);
    
    const startButton = screen.getByText('Start Call');
    expect(startButton).toBeInTheDocument();
    
    fireEvent.click(startButton);
    expect(mockUseCallController.startCall).toHaveBeenCalledTimes(1);
  });

  test('shows End Call button when connected', () => {
    (useCallController as jest.Mock).mockReturnValue({
      ...mockUseCallController,
      isConnected: true
    });
    
    render(<ProspectAgent persona={mockPersona} />);
    
    const endButton = screen.getByText('End Call');
    expect(endButton).toBeInTheDocument();
    
    fireEvent.click(endButton);
    expect(mockUseCallController.endCall).toHaveBeenCalledTimes(1);
  });

  test('shows connecting state', () => {
    (useCallController as jest.Mock).mockReturnValue({
      ...mockUseCallController,
      isConnecting: true
    });
    
    render(<ProspectAgent persona={mockPersona} />);
    
    expect(screen.getByText('Connecting to John Smith...')).toBeInTheDocument();
  });

  test('displays transcript when available', () => {
    const transcript = 'This is a test transcript';
    (useCallController as jest.Mock).mockReturnValue({
      ...mockUseCallController,
      isConnected: true,
      transcript
    });
    
    render(<ProspectAgent persona={mockPersona} />);
    
    expect(screen.getByText(transcript)).toBeInTheDocument();
  });

  test('displays call duration when connected', () => {
    (useCallController as jest.Mock).mockReturnValue({
      ...mockUseCallController,
      isConnected: true,
      callDuration: 65 // 1:05
    });
    
    render(<ProspectAgent persona={mockPersona} />);
    
    expect(screen.getByText('Call time: 1:05')).toBeInTheDocument();
  });

  test('displays error message when there is an error', () => {
    const errorMessage = 'Failed to connect';
    (useCallController as jest.Mock).mockReturnValue({
      ...mockUseCallController,
      error: new Error(errorMessage)
    });
    
    render(<ProspectAgent persona={mockPersona} />);
    
    expect(screen.getByText(`Error: ${errorMessage}`)).toBeInTheDocument();
  });

  test('calls onCallEnd when ending call', () => {
    const onCallEnd = jest.fn();
    (useCallController as jest.Mock).mockReturnValue({
      ...mockUseCallController,
      isConnected: true
    });
    
    render(<ProspectAgent persona={mockPersona} onCallEnd={onCallEnd} />);
    
    const endButton = screen.getByText('End Call');
    fireEvent.click(endButton);
    
    expect(mockUseCallController.endCall).toHaveBeenCalledTimes(1);
    expect(onCallEnd).toHaveBeenCalledTimes(1);
  });

  test('cleans up on unmount', () => {
    const { unmount } = render(<ProspectAgent persona={mockPersona} />);
    
    unmount();
    
    expect(mockUseCallController.endCall).toHaveBeenCalledTimes(1);
  });
});
