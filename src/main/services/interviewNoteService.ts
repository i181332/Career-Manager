import { InterviewNoteRepository } from '../../database/repositories/interviewNoteRepository';
import { InterviewNote } from '../../database/types';

export class InterviewNoteService {
  private interviewNoteRepository: InterviewNoteRepository;

  constructor() {
    this.interviewNoteRepository = new InterviewNoteRepository();
  }

  create(noteData: {
    user_id: number;
    company_id: number;
    interview_date: string;
    round?: string;
    interviewer?: string;
    questions?: string;
    answers?: string;
    impression?: string;
    result?: string;
  }): { success: boolean; note?: InterviewNote; error?: string } {
    try {
      const note = this.interviewNoteRepository.create(noteData);
      return { success: true, note };
    } catch (error) {
      console.error('Create interview note error:', error);
      return { success: false, error: '面接ノートの作成に失敗しました' };
    }
  }

  getById(id: number): { success: boolean; note?: InterviewNote; error?: string } {
    try {
      const note = this.interviewNoteRepository.findById(id);
      if (!note) {
        return { success: false, error: '面接ノートが見つかりません' };
      }
      return { success: true, note };
    } catch (error) {
      console.error('Get interview note error:', error);
      return { success: false, error: '面接ノートの取得に失敗しました' };
    }
  }

  getByUserId(userId: number): { success: boolean; notes?: InterviewNote[]; error?: string } {
    try {
      const notes = this.interviewNoteRepository.findByUserId(userId);
      return { success: true, notes };
    } catch (error) {
      console.error('Get interview notes error:', error);
      return { success: false, error: '面接ノート一覧の取得に失敗しました' };
    }
  }

  getByCompanyId(companyId: number): { success: boolean; notes?: InterviewNote[]; error?: string } {
    try {
      const notes = this.interviewNoteRepository.findByCompanyId(companyId);
      return { success: true, notes };
    } catch (error) {
      console.error('Get interview notes by company error:', error);
      return { success: false, error: '面接ノートの取得に失敗しました' };
    }
  }

  search(userId: number, query: string): { success: boolean; notes?: InterviewNote[]; error?: string } {
    try {
      const notes = this.interviewNoteRepository.search(userId, query);
      return { success: true, notes };
    } catch (error) {
      console.error('Search interview notes error:', error);
      return { success: false, error: '面接ノートの検索に失敗しました' };
    }
  }

  update(
    id: number,
    noteData: Partial<{
      interview_date: string;
      round: string;
      interviewer: string;
      questions: string;
      answers: string;
      impression: string;
      result: string;
    }>
  ): { success: boolean; note?: InterviewNote; error?: string } {
    try {
      const note = this.interviewNoteRepository.update(id, noteData);
      if (!note) {
        return { success: false, error: '面接ノートが見つかりません' };
      }
      return { success: true, note };
    } catch (error) {
      console.error('Update interview note error:', error);
      return { success: false, error: '面接ノートの更新に失敗しました' };
    }
  }

  delete(id: number): { success: boolean; error?: string } {
    try {
      const result = this.interviewNoteRepository.delete(id);
      if (!result) {
        return { success: false, error: '面接ノートが見つかりません' };
      }
      return { success: true };
    } catch (error) {
      console.error('Delete interview note error:', error);
      return { success: false, error: '面接ノートの削除に失敗しました' };
    }
  }

  getUpcoming(userId: number, daysAhead: number = 7): { success: boolean; notes?: InterviewNote[]; error?: string } {
    try {
      const notes = this.interviewNoteRepository.getUpcoming(userId, daysAhead);
      return { success: true, notes };
    } catch (error) {
      console.error('Get upcoming interviews error:', error);
      return { success: false, error: '今後の面接の取得に失敗しました' };
    }
  }
}
