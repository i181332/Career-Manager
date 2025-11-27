import { EmailMessageRepository } from '../../database/repositories/emailMessageRepository';
import { CompanyEmailPatternRepository } from '../../database/repositories/companyEmailPatternRepository';
import { CompanyRepository } from '../../database/repositories/companyRepository';
import { Result, Company, CompanyEmailPattern } from '../../database/types';
import { GmailClient } from './gmailClient';

export class EmailAllocationService {
  private emailMessageRepo: EmailMessageRepository;
  private patternRepo: CompanyEmailPatternRepository;
  private companyRepo: CompanyRepository;

  constructor() {
    this.emailMessageRepo = new EmailMessageRepository();
    this.patternRepo = new CompanyEmailPatternRepository();
    this.companyRepo = new CompanyRepository();
  }

  // 自動割り振り実行
  async allocateEmail(emailMessageId: number): Promise<Result<Company | null>> {
    try {
      const email = this.emailMessageRepo.findById(emailMessageId);
      if (!email) {
        return { success: false, error: 'Email not found' };
      }

      // すでに割り振り済みの場合はスキップ
      if (email.company_id) {
        const company = this.companyRepo.findById(email.company_id);
        return { success: true, data: company || null };
      }

      // 1. 送信元アドレス完全一致
      let patterns = this.patternRepo.findMatchingPattern('address', email.from_address);
      if (patterns.length > 0) {
        const company = this.companyRepo.findById(patterns[0].company_id);
        if (company) {
          this.emailMessageRepo.updateCompanyAllocation(emailMessageId, company.id, 'auto');
          return { success: true, data: company };
        }
      }

      // 2. ドメイン一致
      const domain = GmailClient.extractDomain(email.from_address);
      if (domain) {
        patterns = this.patternRepo.findMatchingDomainPattern(email.from_address);
        if (patterns.length > 0) {
          const company = this.companyRepo.findById(patterns[0].company_id);
          if (company) {
            this.emailMessageRepo.updateCompanyAllocation(emailMessageId, company.id, 'auto');
            return { success: true, data: company };
          }
        }
      }

      // 3. 件名キーワード一致
      if (email.subject) {
        patterns = this.patternRepo.findMatchingSubjectPattern(email.subject);
        if (patterns.length > 0) {
          const company = this.companyRepo.findById(patterns[0].company_id);
          if (company) {
            this.emailMessageRepo.updateCompanyAllocation(emailMessageId, company.id, 'auto');
            return { success: true, data: company };
          }
        }
      }

      // マッチしない場合はnull
      return { success: true, data: null };
    } catch (error: any) {
      console.error('Error allocating email:', error);
      return { success: false, error: error.message };
    }
  }

  // 手動割り振り
  async manuallyAllocate(emailMessageId: number, companyId: number): Promise<Result<void>> {
    try {
      const email = this.emailMessageRepo.findById(emailMessageId);
      if (!email) {
        return { success: false, error: 'Email not found' };
      }

      const company = this.companyRepo.findById(companyId);
      if (!company) {
        return { success: false, error: 'Company not found' };
      }

      this.emailMessageRepo.updateCompanyAllocation(emailMessageId, companyId, 'manual');
      return { success: true };
    } catch (error: any) {
      console.error('Error manually allocating email:', error);
      return { success: false, error: error.message };
    }
  }

  // 割り振り解除
  async unallocate(emailMessageId: number): Promise<Result<void>> {
    try {
      const email = this.emailMessageRepo.findById(emailMessageId);
      if (!email) {
        return { success: false, error: 'Email not found' };
      }

      this.emailMessageRepo.updateCompanyAllocation(emailMessageId, null, 'manual');
      return { success: true };
    } catch (error: any) {
      console.error('Error unallocating email:', error);
      return { success: false, error: error.message };
    }
  }

  // パターン追加
  async addPattern(
    companyId: number,
    patternData: {
      pattern_type: string;
      pattern_value: string;
      priority?: number;
    }
  ): Promise<Result<CompanyEmailPattern>> {
    try {
      const company = this.companyRepo.findById(companyId);
      if (!company) {
        return { success: false, error: 'Company not found' };
      }

      const pattern = this.patternRepo.create({
        company_id: companyId,
        pattern_type: patternData.pattern_type,
        pattern_value: patternData.pattern_value,
        priority: patternData.priority || 0,
      });

      return { success: true, data: pattern };
    } catch (error: any) {
      console.error('Error adding pattern:', error);
      return { success: false, error: error.message };
    }
  }

  // パターン削除
  async removePattern(patternId: number): Promise<Result<void>> {
    try {
      const deleted = this.patternRepo.delete(patternId);
      if (!deleted) {
        return { success: false, error: 'Pattern not found' };
      }
      return { success: true };
    } catch (error: any) {
      console.error('Error removing pattern:', error);
      return { success: false, error: error.message };
    }
  }

  // パターン取得
  async getPatterns(companyId: number): Promise<Result<CompanyEmailPattern[]>> {
    try {
      const patterns = this.patternRepo.findByCompanyId(companyId);
      return { success: true, data: patterns };
    } catch (error: any) {
      console.error('Error getting patterns:', error);
      return { success: false, error: error.message };
    }
  }

  // 一括再割り振り
  async reallocateAllEmails(emailAccountId: number): Promise<Result<{ reallocated: number }>> {
    try {
      // 自動割り振りされたメールの割り振りをクリア
      this.emailMessageRepo.clearAllAllocations(emailAccountId);

      // 全メールを取得して再割り振り
      const emails = this.emailMessageRepo.findByEmailAccountId(emailAccountId, { limit: 1000 });
      let reallocated = 0;

      for (const email of emails) {
        const result = await this.allocateEmail(email.id);
        if (result.success && result.data) {
          reallocated++;
        }
      }

      return { success: true, data: { reallocated } };
    } catch (error: any) {
      console.error('Error reallocating emails:', error);
      return { success: false, error: error.message };
    }
  }
}
