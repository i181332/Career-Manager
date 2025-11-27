import '@testing-library/jest-dom';

// Mock window.api
global.window = global.window || {};
(global.window as any).api = {
  ping: jest.fn(),
  register: jest.fn(),
  login: jest.fn(),
  getUser: jest.fn(),
  updateUser: jest.fn(),
  getCompanies: jest.fn(),
  getCompany: jest.fn(),
  createCompany: jest.fn(),
  updateCompany: jest.fn(),
  deleteCompany: jest.fn(),
  getEvents: jest.fn(),
  getEvent: jest.fn(),
  createEvent: jest.fn(),
  updateEvent: jest.fn(),
  deleteEvent: jest.fn(),
  getESEntries: jest.fn(),
  getESEntry: jest.fn(),
  createESEntry: jest.fn(),
  updateESEntry: jest.fn(),
  deleteESEntry: jest.fn(),
  exportData: jest.fn(),
};
