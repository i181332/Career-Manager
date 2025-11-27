import { app, dialog } from 'electron';
import fs from 'fs';
import path from 'path';
import { CompanyRepository } from '../../database/repositories/companyRepository';
import { EventRepository } from '../../database/repositories/eventRepository';
import { ESEntryRepository } from '../../database/repositories/esEntryRepository';
import { SelfAnalysisRepository } from '../../database/repositories/selfAnalysisRepository';
import { InterviewNoteRepository } from '../../database/repositories/interviewNoteRepository';

export class ExportService {
  private companyRepo: CompanyRepository;
  private eventRepo: EventRepository;
  private esRepo: ESEntryRepository;
  private selfAnalysisRepo: SelfAnalysisRepository;
  private interviewNoteRepo: InterviewNoteRepository;

  constructor() {
    this.companyRepo = new CompanyRepository();
    this.eventRepo = new EventRepository();
    this.esRepo = new ESEntryRepository();
    this.selfAnalysisRepo = new SelfAnalysisRepository();
    this.interviewNoteRepo = new InterviewNoteRepository();
  }

  async exportData(format: 'json' | 'csv', dataType: string, userId: number) {
    try {
      let data: any;
      let fileName: string;

      switch (dataType) {
        case 'all':
          data = await this.getAllData(userId);
          fileName = `就活データ_全体_${this.getTimestamp()}`;
          break;
        case 'companies':
          data = this.companyRepo.findByUserId(userId);
          fileName = `企業一覧_${this.getTimestamp()}`;
          break;
        case 'events':
          data = this.eventRepo.findByUserId(userId);
          fileName = `イベント一覧_${this.getTimestamp()}`;
          break;
        case 'es':
          data = this.esRepo.findByUserId(userId);
          fileName = `ES一覧_${this.getTimestamp()}`;
          break;
        case 'selfAnalyses':
          data = this.selfAnalysisRepo.findByUserId(userId);
          fileName = `自己分析_${this.getTimestamp()}`;
          break;
        case 'interviewNotes':
          data = this.interviewNoteRepo.findByUserId(userId);
          fileName = `面接ノート_${this.getTimestamp()}`;
          break;
        default:
          return { success: false, error: '不明なデータタイプです' };
      }

      const result = await dialog.showSaveDialog({
        defaultPath: path.join(app.getPath('documents'), `${fileName}.${format}`),
        filters: [
          { name: format.toUpperCase(), extensions: [format] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (result.canceled || !result.filePath) {
        return { success: false, error: 'キャンセルされました' };
      }

      if (format === 'json') {
        fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2), 'utf8');
      } else {
        const csv = this.convertToCSV(data);
        fs.writeFileSync(result.filePath, csv, 'utf8');
      }

      return { success: true, filePath: result.filePath };
    } catch (error) {
      console.error('Export error:', error);
      return { success: false, error: String(error) };
    }
  }

  private async getAllData(userId: number) {
    return {
      companies: this.companyRepo.findByUserId(userId),
      events: this.eventRepo.findByUserId(userId),
      esEntries: this.esRepo.findByUserId(userId),
      selfAnalyses: this.selfAnalysisRepo.findByUserId(userId),
      interviewNotes: this.interviewNoteRepo.findByUserId(userId),
      exportedAt: new Date().toISOString(),
    };
  }

  private convertToCSV(data: any): string {
    if (!Array.isArray(data)) {
      data = [data];
    }

    if (data.length === 0) {
      return '';
    }

    const headers = Object.keys(data[0]);
    const rows = data.map((item: any) =>
      headers.map((header) => {
        const value = item[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      })
    );

    const csvContent = [headers.join(','), ...rows.map((row: any[]) => row.join(','))].join('\n');

    return '\uFEFF' + csvContent; // BOM for Excel
  }

  private getTimestamp(): string {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
      now.getDate()
    ).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(
      now.getMinutes()
    ).padStart(2, '0')}`;
  }
}
