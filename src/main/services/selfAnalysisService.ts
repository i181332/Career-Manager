import { SelfAnalysisRepository } from '../../database/repositories/selfAnalysisRepository';
import { SelfAnalysis } from '../../database/types';

export class SelfAnalysisService {
  private selfAnalysisRepository: SelfAnalysisRepository;

  constructor() {
    this.selfAnalysisRepository = new SelfAnalysisRepository();
  }

  create(analysisData: {
    user_id: number;
    category: string;
    title: string;
    content: string;
    tags?: string;
    linked_companies?: string;
  }): { success: boolean; analysis?: SelfAnalysis; error?: string } {
    try {
      const analysis = this.selfAnalysisRepository.create(analysisData);
      return { success: true, analysis };
    } catch (error) {
      console.error('Create self analysis error:', error);
      return { success: false, error: '自己分析の作成に失敗しました' };
    }
  }

  getById(id: number): { success: boolean; analysis?: SelfAnalysis; error?: string } {
    try {
      const analysis = this.selfAnalysisRepository.findById(id);
      if (!analysis) {
        return { success: false, error: '自己分析が見つかりません' };
      }
      return { success: true, analysis };
    } catch (error) {
      console.error('Get self analysis error:', error);
      return { success: false, error: '自己分析の取得に失敗しました' };
    }
  }

  getByUserId(userId: number): { success: boolean; selfAnalyses?: SelfAnalysis[]; error?: string } {
    try {
      const selfAnalyses = this.selfAnalysisRepository.findByUserId(userId);
      return { success: true, selfAnalyses };
    } catch (error) {
      console.error('Get self analyses error:', error);
      return { success: false, error: '自己分析一覧の取得に失敗しました' };
    }
  }

  getByCategory(userId: number, category: string): { success: boolean; selfAnalyses?: SelfAnalysis[]; error?: string } {
    try {
      const selfAnalyses = this.selfAnalysisRepository.findByCategory(userId, category);
      return { success: true, selfAnalyses };
    } catch (error) {
      console.error('Get self analyses by category error:', error);
      return { success: false, error: '自己分析の取得に失敗しました' };
    }
  }

  search(userId: number, query: string): { success: boolean; selfAnalyses?: SelfAnalysis[]; error?: string } {
    try {
      const selfAnalyses = this.selfAnalysisRepository.search(userId, query);
      return { success: true, selfAnalyses };
    } catch (error) {
      console.error('Search self analyses error:', error);
      return { success: false, error: '自己分析の検索に失敗しました' };
    }
  }

  update(
    id: number,
    analysisData: Partial<{
      category: string;
      title: string;
      content: string;
      tags: string;
      linked_companies: string;
    }>
  ): { success: boolean; analysis?: SelfAnalysis; error?: string } {
    try {
      const analysis = this.selfAnalysisRepository.update(id, analysisData);
      if (!analysis) {
        return { success: false, error: '自己分析が見つかりません' };
      }
      return { success: true, analysis };
    } catch (error) {
      console.error('Update self analysis error:', error);
      return { success: false, error: '自己分析の更新に失敗しました' };
    }
  }

  delete(id: number): { success: boolean; error?: string } {
    try {
      const result = this.selfAnalysisRepository.delete(id);
      if (!result) {
        return { success: false, error: '自己分析が見つかりません' };
      }
      return { success: true };
    } catch (error) {
      console.error('Delete self analysis error:', error);
      return { success: false, error: '自己分析の削除に失敗しました' };
    }
  }

  getCategories(userId: number): { success: boolean; categories?: string[]; error?: string } {
    try {
      const categories = this.selfAnalysisRepository.getCategories(userId);
      return { success: true, categories };
    } catch (error) {
      console.error('Get categories error:', error);
      return { success: false, error: 'カテゴリ一覧の取得に失敗しました' };
    }
  }
}
