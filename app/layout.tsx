import './globals.css'

export const metadata = {
  title: 'AI美式照片照相馆 - 专业证件照生成',
  description: 'AI驱动的专业证件照生成服务',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="selection:bg-blue-100 selection:text-blue-900">
        {children}
      </body>
    </html>
  )
}
