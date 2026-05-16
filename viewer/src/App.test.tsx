import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

test('renders historical archive controls', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /sparta \/ oldnews/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/search desktop archive/i)).toBeInTheDocument();
});

test('side navigation opens map and timeline views', () => {
  render(<App />);
  const nav = screen.getByLabelText('Archive sections');

  userEvent.click(within(nav).getByRole('button', { name: 'Map' }));
  expect(screen.getByRole('heading', { name: 'Mapped Archive' })).toBeInTheDocument();

  userEvent.click(within(nav).getByRole('button', { name: 'Timeline' }));
  expect(screen.getByRole('heading', { name: 'Timeline Heat' })).toBeInTheDocument();
});
