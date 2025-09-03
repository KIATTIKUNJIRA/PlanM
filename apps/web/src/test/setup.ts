import '@testing-library/jest-dom';
import React from 'react';
import { vi } from 'vitest';

// Mock heavy Leaflet MapPicker to a lightweight div
vi.mock('@/components/map/MapPicker', () => ({
	default: () => React.createElement('div', { 'data-testid': 'map-mock' }),
}));

// Mock react-hot-toast (named export usage in app: { toast })
vi.mock('react-hot-toast', () => {
	const messages: string[] = [];
	const toast = {
		error: (m: string) => { messages.push(m); },
		success: (m: string) => { messages.push(m); },
		_messages: messages,
	};
	return { toast };
});

// Mock next/router (app uses pages router)
vi.mock('next/router', () => ({
	useRouter: () => ({ push: vi.fn(), replace: vi.fn(), pathname: '/', query: {} }),
}));

// If code ever migrates to next/navigation, keep an additional mock (harmless otherwise)
vi.mock('next/navigation', () => ({
	useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

