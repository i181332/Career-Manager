import { CompanyRepository } from '../../database/repositories/companyRepository';
import { Company } from '../../database/types';

export class CompanyService {
  private companyRepository: CompanyRepository;

  constructor() {
    this.companyRepository = new CompanyRepository();
  }

  create(companyData: {
    user_id: number;
    name: string;
    industry?: string;
    size?: string;
    url?: string;
    status?: string;
    memo?: string;
  }): { success: boolean; company?: Company; error?: string } {
    try {
      const company = this.companyRepository.create(companyData);
      return { success: true, company };
    } catch (error) {
      console.error('Create company error:', error);
      return { success: false, error: '企業の作成に失敗しました' };
    }
  }

  getById(id: number): { success: boolean; company?: Company; error?: string } {
    try {
      const company = this.companyRepository.findById(id);
      if (!company) {
        return { success: false, error: '企業が見つかりません' };
      }
      return { success: true, company };
    } catch (error) {
      console.error('Get company error:', error);
      return { success: false, error: '企業の取得に失敗しました' };
    }
  }

  getByUserId(userId: number): { success: boolean; companies?: Company[]; error?: string } {
    try {
      const companies = this.companyRepository.findByUserId(userId);
      return { success: true, companies };
    } catch (error) {
      console.error('Get companies error:', error);
      return { success: false, error: '企業一覧の取得に失敗しました' };
    }
  }

  getByStatus(
    userId: number,
    status: string
  ): { success: boolean; companies?: Company[]; error?: string } {
    try {
      const companies = this.companyRepository.findByStatus(userId, status);
      return { success: true, companies };
    } catch (error) {
      console.error('Get companies by status error:', error);
      return { success: false, error: '企業一覧の取得に失敗しました' };
    }
  }

  update(
    id: number,
    companyData: Partial<{
      name: string;
      industry: string;
      size: string;
      url: string;
      status: string;
      memo: string;
    }>
  ): { success: boolean; company?: Company; error?: string } {
    try {
      const company = this.companyRepository.update(id, companyData);
      if (!company) {
        return { success: false, error: '企業が見つかりません' };
      }
      return { success: true, company };
    } catch (error) {
      console.error('Update company error:', error);
      return { success: false, error: '企業の更新に失敗しました' };
    }
  }

  delete(id: number): { success: boolean; error?: string } {
    try {
      const result = this.companyRepository.delete(id);
      if (!result) {
        return { success: false, error: '企業が見つかりません' };
      }
      return { success: true };
    } catch (error) {
      console.error('Delete company error:', error);
      return { success: false, error: '企業の削除に失敗しました' };
    }
  }

  search(userId: number, query: string): { success: boolean; companies?: Company[]; error?: string } {
    try {
      const companies = this.companyRepository.search(userId, query);
      return { success: true, companies };
    } catch (error) {
      console.error('Search companies error:', error);
      return { success: false, error: '企業の検索に失敗しました' };
    }
  }
}
