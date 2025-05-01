from http.server import HTTPServer, SimpleHTTPRequestHandler
import json
import os
from urllib.parse import parse_qs, urlparse
import base64

class ImageUploadHandler(SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/upload-image':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            # 解析 FormData
            form_data = parse_qs(post_data.decode('utf-8'))
            image_data = form_data.get('image', [None])[0]
            barcode = form_data.get('barcode', [None])[0]
            
            if image_data and barcode:
                # 確保 images 資料夾存在
                if not os.path.exists('images'):
                    os.makedirs('images')
                
                # 儲存圖片
                image_path = f'images/{barcode}.jpg'
                with open(image_path, 'wb') as f:
                    f.write(base64.b64decode(image_data))
                
                # 回傳成功訊息
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'success': True}).encode())
            else:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': '無效的圖片資料'}).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def guess_type(self, path):
        """重寫 MIME 類型猜測方法"""
        base, ext = os.path.splitext(path)
        if ext == '.js':
            return 'application/javascript'
        return super().guess_type(path)

    def translate_path(self, path):
        """重寫路徑轉換方法"""
        # 解析 URL 路徑
        parsed_path = urlparse(path)
        path = parsed_path.path
        
        # 移除開頭的斜線
        if path.startswith('/'):
            path = path[1:]
            
        # 如果路徑為空，返回 index.html
        if not path:
            path = 'index.html'
            
        # 返回相對於當前目錄的完整路徑
        return os.path.join(os.getcwd(), path)

def run(server_class=HTTPServer, handler_class=ImageUploadHandler, port=8000):
    server_address = ('', port)
    httpd = server_class(server_address, handler_class)
    print(f'啟動伺服器在 port {port}...')
    httpd.serve_forever()

if __name__ == '__main__':
    run() 