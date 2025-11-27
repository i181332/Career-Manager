import bcrypt from 'bcrypt';
import { UserRepository } from '../../database/repositories/userRepository';
import { LoginHistoryRepository } from '../../database/repositories/loginHistoryRepository';
import { User } from '../../database/types';

const SALT_ROUNDS = 10;

export class AuthService {
  private userRepository: UserRepository;
  private loginHistoryRepo: LoginHistoryRepository;

  constructor() {
    this.userRepository = new UserRepository();
    this.loginHistoryRepo = new LoginHistoryRepository();
  }

  async register(userData: {
    name: string;
    email: string;
    password: string;
    slack_user_id?: string;
  }): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      // メールアドレスの重複チェック
      const existingUser = this.userRepository.findByEmail(userData.email);
      if (existingUser) {
        return { success: false, error: 'このメールアドレスは既に登録されています' };
      }

      // パスワードのハッシュ化
      const password_hash = await bcrypt.hash(userData.password, SALT_ROUNDS);

      // ユーザー作成
      const user = this.userRepository.create({
        name: userData.name,
        email: userData.email,
        password_hash,
        slack_user_id: userData.slack_user_id,
      });

      // パスワードハッシュを除外して返す
      const { password_hash: _, ...userWithoutPassword } = user;

      return { success: true, user: userWithoutPassword as User };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'ユーザー登録に失敗しました' };
    }
  }

  async login(
    email: string,
    password: string
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      // ユーザーの検索
      const user = this.userRepository.findByEmail(email);
      if (!user) {
        return { success: false, error: 'メールアドレスまたはパスワードが正しくありません' };
      }

      // パスワードの検証
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        return { success: false, error: 'メールアドレスまたはパスワードが正しくありません' };
      }

      // ログイン履歴を記録
      this.loginHistoryRepo.create({
        user_id: user.id,
        ip_address: 'localhost',
        user_agent: 'Electron App',
      });

      // 古いログイン履歴を削除（最新100件のみ保持）
      this.loginHistoryRepo.deleteOldRecords(user.id, 100);

      // パスワードハッシュを除外して返す
      const { password_hash: _, ...userWithoutPassword } = user;

      return { success: true, user: userWithoutPassword as User };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'ログインに失敗しました' };
    }
  }

  getUser(userId: number): User | undefined {
    const user = this.userRepository.findById(userId);
    if (!user) return undefined;

    // パスワードハッシュを除外して返す
    const { password_hash: _, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  }

  updateUser(
    userId: number,
    userData: Partial<{
      name: string;
      email: string;
      slack_user_id: string;
      settings: string;
    }>
  ): { success: boolean; user?: User; error?: string } {
    try {
      const updatedUser = this.userRepository.update(userId, userData);
      if (!updatedUser) {
        return { success: false, error: 'ユーザーが見つかりません' };
      }

      // パスワードハッシュを除外して返す
      const { password_hash: _, ...userWithoutPassword } = updatedUser;
      return { success: true, user: userWithoutPassword as User };
    } catch (error) {
      console.error('Update user error:', error);
      return { success: false, error: 'ユーザー情報の更新に失敗しました' };
    }
  }

  getLoginHistory(userId: number, limit: number = 50) {
    try {
      const history = this.loginHistoryRepo.findByUserId(userId, limit);
      return { success: true, history };
    } catch (error) {
      console.error('Get login history error:', error);
      return { success: false, error: 'ログイン履歴の取得に失敗しました' };
    }
  }

  getLastLogin(userId: number) {
    try {
      const lastLogin = this.loginHistoryRepo.getLastLogin(userId);
      return { success: true, lastLogin };
    } catch (error) {
      console.error('Get last login error:', error);
      return { success: false, error: '最終ログイン情報の取得に失敗しました' };
    }
  }
}

