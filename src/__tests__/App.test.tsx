import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

describe('Application Tests', () => {
  test('basic test example', () => {
    expect(true).toBe(true);
  });

  test('string concatenation', () => {
    const result = '就活' + '管理';
    expect(result).toBe('就活管理');
  });

  test('array operations', () => {
    const companies = ['Company A', 'Company B'];
    expect(companies).toHaveLength(2);
    expect(companies).toContain('Company A');
  });
});
