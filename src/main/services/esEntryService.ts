import { ESEntryRepository } from '../../database/repositories/esEntryRepository';
import { ESVersionRepository } from '../../database/repositories/esVersionRepository';
import { ESEntry } from '../../database/types';

export class ESEntryService {
  private esEntryRepository: ESEntryRepository;
  private esVersionRepository: ESVersionRepository;

  constructor() {
    this.esEntryRepository = new ESEntryRepository();
    this.esVersionRepository = new ESVersionRepository();
  }

  create(esData: {
    user_id: number;
    company_id: number;
    title: string;
    deadline?: string;
    status?: string;
    questions?: string;
    answers?: string;
    memo?: string;
  }): { success: boolean; esEntry?: ESEntry; error?: string } {
    try {
      const esEntry = this.esEntryRepository.create(esData);
      return { success: true, esEntry };
    } catch (error) {
      console.error('Create ES entry error:', error);
      return { success: false, error: 'ESエントリーの作成に失敗しました' };
    }
  }

  getById(id: number): { success: boolean; esEntry?: ESEntry; error?: string } {
    try {
      const esEntry = this.esEntryRepository.findById(id);
      if (!esEntry) {
        return { success: false, error: 'ESエントリーが見つかりません' };
      }
      return { success: true, esEntry };
    } catch (error) {
      console.error('Get ES entry error:', error);
      return { success: false, error: 'ESエントリーの取得に失敗しました' };
    }
  }

  getByUserId(userId: number): { success: boolean; esEntries?: ESEntry[]; error?: string } {
    try {
      const esEntries = this.esEntryRepository.findByUserId(userId);
      return { success: true, esEntries };
    } catch (error) {
      console.error('Get ES entries error:', error);
      return { success: false, error: 'ESエントリー一覧の取得に失敗しました' };
    }
  }

  getByCompanyId(companyId: number): { success: boolean; esEntries?: ESEntry[]; error?: string } {
    try {
      const esEntries = this.esEntryRepository.findByCompanyId(companyId);
      return { success: true, esEntries };
    } catch (error) {
      console.error('Get ES entries by company error:', error);
      return { success: false, error: 'ESエントリーの取得に失敗しました' };
    }
  }

  getByStatus(userId: number, status: string): { success: boolean; esEntries?: ESEntry[]; error?: string } {
    try {
      const esEntries = this.esEntryRepository.findByStatus(userId, status);
      return { success: true, esEntries };
    } catch (error) {
      console.error('Get ES entries by status error:', error);
      return { success: false, error: 'ESエントリーの取得に失敗しました' };
    }
  }

  search(userId: number, query: string): { success: boolean; esEntries?: ESEntry[]; error?: string } {
    try {
      const esEntries = this.esEntryRepository.search(userId, query);
      return { success: true, esEntries };
    } catch (error) {
      console.error('Search ES entries error:', error);
      return { success: false, error: 'ESエントリーの検索に失敗しました' };
    }
  }

  update(
    id: number,
    esData: Partial<{
      title: string;
      deadline: string;
      status: string;
      questions: string;
      answers: string;
      memo: string;
    }>
  ): { success: boolean; esEntry?: ESEntry; error?: string } {
    try {
      const esEntry = this.esEntryRepository.update(id, esData);
      if (!esEntry) {
        return { success: false, error: 'ESエントリーが見つかりません' };
      }
      return { success: true, esEntry };
    } catch (error) {
      console.error('Update ES entry error:', error);
      return { success: false, error: 'ESエントリーの更新に失敗しました' };
    }
  }

  delete(id: number): { success: boolean; error?: string } {
    try {
      const result = this.esEntryRepository.delete(id);
      if (!result) {
        return { success: false, error: 'ESエントリーが見つかりません' };
      }
      return { success: true };
    } catch (error) {
      console.error('Delete ES entry error:', error);
      return { success: false, error: 'ESエントリーの削除に失敗しました' };
    }
  }

  getDeadlineApproaching(userId: number, daysAhead: number = 7): { success: boolean; esEntries?: ESEntry[]; error?: string } {
    try {
      const esEntries = this.esEntryRepository.getDeadlineApproaching(userId, daysAhead);
      return { success: true, esEntries };
    } catch (error) {
      console.error('Get deadline approaching ES entries error:', error);
      return { success: false, error: '締切が近いESエントリーの取得に失敗しました' };
    }
  }

  // バージョン管理機能
  createVersion(esEntryId: number, content: string, userId: number): { success: boolean; version?: any; error?: string } {
    try {
      const version = this.esVersionRepository.createVersion(esEntryId, content, userId);
      return { success: true, version };
    } catch (error) {
      console.error('Create ES version error:', error);
      return { success: false, error: 'バージョンの作成に失敗しました' };
    }
  }

  getVersions(esEntryId: number): { success: boolean; versions?: any[]; error?: string } {
    try {
      const versions = this.esVersionRepository.getByESEntryId(esEntryId);
      return { success: true, versions };
    } catch (error) {
      console.error('Get ES versions error:', error);
      return { success: false, error: 'バージョン履歴の取得に失敗しました' };
    }
  }

  restoreVersion(esEntryId: number, versionId: number): { success: boolean; esEntry?: ESEntry; error?: string } {
    try {
      const version = this.esVersionRepository.getById(versionId);
      if (!version) {
        return { success: false, error: 'バージョンが見つかりません' };
      }

      const esEntry = this.esEntryRepository.update(esEntryId, {
        answers: version.content,
      });

      if (!esEntry) {
        return { success: false, error: 'ESエントリーの復元に失敗しました' };
      }

      return { success: true, esEntry };
    } catch (error) {
      console.error('Restore ES version error:', error);
      return { success: false, error: 'バージョンの復元に失敗しました' };
    }
  }
}
