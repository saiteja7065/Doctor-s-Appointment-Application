import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StatusIndicator, { useStatusIndicator, statusMessages } from '@/components/notifications/StatusIndicator';

describe('StatusIndicator', () => {
  it('should render with default props', () => {
    render(<StatusIndicator status="idle" />);
    
    expect(screen.getByText('Idle')).toBeInTheDocument();
  });

  it('should render with custom message', () => {
    render(<StatusIndicator status="loading" message="Processing..." />);
    
    expect(screen.getByText('Processing...')).toBeInTheDocument();
    expect(screen.getByText('Loading')).toBeInTheDocument();
  });

  it('should render with action button', () => {
    const mockAction = jest.fn();
    render(
      <StatusIndicator 
        status="error" 
        message="Something went wrong" 
        actionLabel="Retry"
        onAction={mockAction}
      />
    );
    
    const button = screen.getByText('Retry');
    expect(button).toBeInTheDocument();
    
    fireEvent.click(button);
    expect(mockAction).toHaveBeenCalled();
  });

  it('should render compact variant', () => {
    render(
      <StatusIndicator 
        status="success" 
        message="Done" 
        variant="compact"
      />
    );
    
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('should render inline variant', () => {
    render(
      <StatusIndicator 
        status="warning" 
        message="Warning message" 
        variant="inline"
      />
    );
    
    expect(screen.getByText('Warning message')).toBeInTheDocument();
  });

  it('should auto-hide when configured', async () => {
    const { container } = render(
      <StatusIndicator 
        status="success" 
        message="Success message" 
        autoHide={true}
        autoHideDelay={100}
      />
    );
    
    expect(screen.getByText('Success message')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    }, { timeout: 200 });
  });

  it('should render with type-specific icon', () => {
    render(
      <StatusIndicator 
        status="success" 
        type="appointment"
        message="Appointment confirmed"
      />
    );
    
    expect(screen.getByText('Appointment confirmed')).toBeInTheDocument();
  });

  it('should not show icon when showIcon is false', () => {
    render(
      <StatusIndicator 
        status="loading" 
        message="Loading..." 
        showIcon={false}
      />
    );
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    // Icon should not be present
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('should not show message when showMessage is false', () => {
    render(
      <StatusIndicator 
        status="success" 
        message="Success message" 
        showMessage={false}
      />
    );
    
    expect(screen.queryByText('Success message')).not.toBeInTheDocument();
    expect(screen.getByText('Success')).toBeInTheDocument(); // Badge should still be there
  });

  it('should apply custom className', () => {
    const { container } = render(
      <StatusIndicator 
        status="idle" 
        className="custom-class"
      />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

describe('useStatusIndicator hook', () => {
  const TestComponent = ({ initialStatus = 'idle' }: { initialStatus?: any }) => {
    const {
      status,
      message,
      setLoading,
      setSuccess,
      setError,
      setWarning,
      setPending,
      setIdle,
    } = useStatusIndicator(initialStatus);

    return (
      <div>
        <div data-testid="status">{status}</div>
        <div data-testid="message">{message}</div>
        <button onClick={() => setLoading('Loading...')}>Set Loading</button>
        <button onClick={() => setSuccess('Success!')}>Set Success</button>
        <button onClick={() => setError('Error occurred')}>Set Error</button>
        <button onClick={() => setWarning('Warning!')}>Set Warning</button>
        <button onClick={() => setPending('Pending...')}>Set Pending</button>
        <button onClick={() => setIdle('Ready')}>Set Idle</button>
      </div>
    );
  };

  it('should initialize with default status', () => {
    render(<TestComponent />);
    
    expect(screen.getByTestId('status')).toHaveTextContent('idle');
  });

  it('should initialize with custom status', () => {
    render(<TestComponent initialStatus="loading" />);
    
    expect(screen.getByTestId('status')).toHaveTextContent('loading');
  });

  it('should update status to loading', () => {
    render(<TestComponent />);
    
    fireEvent.click(screen.getByText('Set Loading'));
    
    expect(screen.getByTestId('status')).toHaveTextContent('loading');
    expect(screen.getByTestId('message')).toHaveTextContent('Loading...');
  });

  it('should update status to success', () => {
    render(<TestComponent />);
    
    fireEvent.click(screen.getByText('Set Success'));
    
    expect(screen.getByTestId('status')).toHaveTextContent('success');
    expect(screen.getByTestId('message')).toHaveTextContent('Success!');
  });

  it('should update status to error', () => {
    render(<TestComponent />);
    
    fireEvent.click(screen.getByText('Set Error'));
    
    expect(screen.getByTestId('status')).toHaveTextContent('error');
    expect(screen.getByTestId('message')).toHaveTextContent('Error occurred');
  });

  it('should update status to warning', () => {
    render(<TestComponent />);
    
    fireEvent.click(screen.getByText('Set Warning'));
    
    expect(screen.getByTestId('status')).toHaveTextContent('warning');
    expect(screen.getByTestId('message')).toHaveTextContent('Warning!');
  });

  it('should update status to pending', () => {
    render(<TestComponent />);
    
    fireEvent.click(screen.getByText('Set Pending'));
    
    expect(screen.getByTestId('status')).toHaveTextContent('pending');
    expect(screen.getByTestId('message')).toHaveTextContent('Pending...');
  });

  it('should update status to idle', () => {
    render(<TestComponent />);
    
    fireEvent.click(screen.getByText('Set Idle'));
    
    expect(screen.getByTestId('status')).toHaveTextContent('idle');
    expect(screen.getByTestId('message')).toHaveTextContent('Ready');
  });
});

describe('statusMessages', () => {
  it('should contain predefined messages for appointment type', () => {
    expect(statusMessages.appointment).toEqual({
      loading: 'Booking appointment...',
      success: 'Appointment booked successfully',
      error: 'Failed to book appointment',
      pending: 'Appointment pending confirmation',
    });
  });

  it('should contain predefined messages for payment type', () => {
    expect(statusMessages.payment).toEqual({
      loading: 'Processing payment...',
      success: 'Payment processed successfully',
      error: 'Payment failed',
      pending: 'Payment pending',
    });
  });

  it('should contain predefined messages for consultation type', () => {
    expect(statusMessages.consultation).toEqual({
      loading: 'Starting consultation...',
      success: 'Consultation started',
      error: 'Failed to start consultation',
      pending: 'Waiting for consultation',
    });
  });

  it('should contain predefined messages for credit type', () => {
    expect(statusMessages.credit).toEqual({
      loading: 'Processing credits...',
      success: 'Credits updated',
      error: 'Failed to update credits',
      warning: 'Low credit balance',
    });
  });

  it('should contain predefined messages for verification type', () => {
    expect(statusMessages.verification).toEqual({
      loading: 'Verifying application...',
      success: 'Application approved',
      error: 'Application rejected',
      pending: 'Application under review',
    });
  });

  it('should contain predefined messages for connection type', () => {
    expect(statusMessages.connection).toEqual({
      loading: 'Connecting...',
      success: 'Connected',
      error: 'Connection failed',
      idle: 'Ready to connect',
    });
  });
});
