import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OfficerComplaintDetail from './OfficerComplaintDetail';
import axios from 'axios';

jest.mock('axios', () => ({
    __esModule: true,
    default: {
        get: jest.fn(),
        put: jest.fn()
    }
}));
jest.mock('react-toastify', () => ({
    toast: {
        success: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        warning: jest.fn()
    }
}));

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useParams: () => ({ id: '507f1f77bcf86cd799439011' }),
    useNavigate: () => mockNavigate
}));

describe('OfficerComplaintDetail review actions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        window.localStorage.setItem('token', 'test-token');
        window.confirm = jest.fn(() => true);

        axios.get
            .mockResolvedValueOnce({
                data: {
                    success: true,
                    complaint: {
                        id: '507f1f77bcf86cd799439011',
                        complaintId: 'CMP-1',
                        category: 'Garbage',
                        description: 'Pending review item',
                        status: 'VERIFICATION_PENDING',
                        department: 'Sanitation',
                        createdAt: new Date('2026-04-22T10:00:00.000Z').toISOString(),
                        location: { address: 'Main Street', lat: 10, lng: 20 },
                        beforeImage: '/before.jpg',
                        afterImage: '/after.jpg',
                        verificationStatus: 'Flagged',
                        resolutionMetadata: {
                            exifCheck: 'fail',
                            labelCheck: 'pass',
                            imageSimilarityCheck: 'pass',
                            log: 'Needs manual review'
                        },
                        officerRemarks: '',
                        assignedFieldWorker: {
                            id: 'worker-1',
                            name: 'Alex',
                            phone: '1234567890',
                            isActive: true,
                            status: 'Busy'
                        },
                        reportedBy: {
                            name: 'Citizen',
                            phone: '9999999999'
                        },
                        timeline: []
                    }
                }
            })
            .mockResolvedValueOnce({
                data: [
                    {
                        _id: 'worker-1',
                        name: 'Alex',
                        department: 'Sanitation',
                        phone: '1234567890',
                        isActive: true,
                        isAvailable: false
                    }
                ]
            });

        axios.put.mockResolvedValue({
            data: {
                success: true
            }
        });
    });

    it('fires approve review action on click', async () => {
        render(<OfficerComplaintDetail />);

        const approveButton = await screen.findByRole('button', { name: /approve resolution/i });
        await userEvent.click(approveButton);

        await waitFor(() => {
            expect(window.confirm).toHaveBeenCalled();
            expect(axios.put).toHaveBeenCalled();
        });
    });
});
