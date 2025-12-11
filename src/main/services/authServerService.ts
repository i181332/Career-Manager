import http from 'http';
import url from 'url';

export class AuthServerService {
    private server: http.Server | null = null;
    private timeoutId: NodeJS.Timeout | null = null;

    start(port: number, timeoutMs: number = 300000): Promise<string> {
        return new Promise((resolve, reject) => {
            this.server = http.createServer((req, res) => {
                const parsedUrl = url.parse(req.url || '', true);

                if (parsedUrl.pathname === '/oauth/callback') {
                    const code = parsedUrl.query.code as string;
                    const error = parsedUrl.query.error as string;

                    if (code) {
                        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                        res.end(`
              <html>
                <body style="font-family: sans-serif; text-align: center; padding-top: 50px;">
                  <h1>認証成功</h1>
                  <p>認証が完了しました。このウィンドウを閉じてアプリに戻ってください。</p>
                  <script>window.close();</script>
                </body>
              </html>
            `);
                        this.stop();
                        resolve(code);
                    } else if (error) {
                        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
                        res.end(`
              <html>
                <body style="font-family: sans-serif; text-align: center; padding-top: 50px; color: red;">
                  <h1>認証エラー</h1>
                  <p>${error}</p>
                </body>
              </html>
            `);
                        this.stop();
                        reject(new Error(error));
                    } else {
                        res.writeHead(400);
                        res.end('No code found');
                    }
                } else {
                    res.writeHead(404);
                    res.end('Not Found');
                }
            });

            this.server.listen(port, () => {
                console.log(`Auth server listening on port ${port}`);
                // タイムアウト設定
                this.timeoutId = setTimeout(() => {
                    console.log('Auth server timed out');
                    this.stop();
                    reject(new Error('Authentication timed out'));
                }, timeoutMs);
            });

            this.server.on('error', (err) => {
                this.stop();
                reject(err);
            });
        });
    }

    stop() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        if (this.server) {
            this.server.close();
            this.server = null;
        }
    }
}
