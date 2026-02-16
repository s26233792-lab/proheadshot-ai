'use client'

import { useEffect, useRef } from 'react'

export default function HomePage() {
  const canvasInitialized = useRef(false)

  useEffect(() => {
    if (!canvasInitialized.current) {
      canvasInitialized.current = true
      // Initialization code here
    }
  }, [])

  return (
    <>
      {/* 顶部导航 */}
      <nav className="fixed top-0 w-full z-50 transition-all duration-300 bg-white/70 backdrop-blur-xl border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 items-center">
            <div className="flex items-center gap-2 group cursor-default">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md group-hover:rotate-12 transition-transform duration-300">
                <i className="fa-solid fa-camera"></i>
              </div>
              <span className="font-bold text-lg tracking-tight">AI美式照相馆</span>
            </div>
            <div className="flex items-center gap-3">
              <button className="w-8 h-8 rounded-full hover:bg-black/5 flex items-center justify-center transition-colors text-slate-500" title="设置">
                <i className="fa-solid fa-sliders"></i>
              </button>
              <div className="bg-black/5 px-3 py-1.5 rounded-full flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer hover:bg-black/10 transition-colors">
                <i className="fa-solid fa-bolt text-amber-500"></i>
                <span><span id="credit-count-nav">0</span> 点数</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* 主界面 */}
      <main className="pt-20 pb-12 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* 左侧：设置面板 */}
          <div className="lg:col-span-4 space-y-6 fade-in-up" style={{animationDelay: '0.1s'}}>
            {/* 1. 上传 */}
            <div className="apple-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-900">照片上传</h2>
                <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Step 1</span>
              </div>
              <div className="bg-slate-100/50 p-1 rounded-xl flex gap-1 mb-4">
                <button className="size-btn option-btn active flex-1 py-2 rounded-lg text-xs font-medium text-center relative overflow-hidden">
                  <span>1:1</span><span className="block text-[10px] opacity-60">护照/签证</span>
                </button>
                <button className="size-btn option-btn flex-1 py-2 rounded-lg text-xs font-medium text-center">
                  <span>3:4</span><span className="block text-[10px] opacity-60">标准2寸</span>
                </button>
                <button className="size-btn option-btn flex-1 py-2 rounded-lg text-xs font-medium text-center">
                  <span>5:7</span><span className="block text-[10px] opacity-60">标准1寸</span>
                </button>
              </div>
              <div className="w-full flex justify-center">
                <div className="upload-wrapper w-full" style={{aspectRatio: '1/1'}}>
                  <div className="upload-area w-full h-full rounded-3xl flex flex-col items-center justify-center cursor-pointer relative overflow-hidden group">
                    <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" accept="image/*" />
                    <div className="text-center p-4 transition-transform duration-300 group-hover:scale-105">
                      <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto mb-3 text-blue-500">
                        <i className="fa-solid fa-plus text-xl"></i>
                      </div>
                      <p className="text-xs font-bold text-slate-700">点击上传</p>
                      <p className="text-[10px] text-slate-400 mt-1">自动人像居中裁剪</p>
                    </div>
                    <img className="hidden absolute inset-0 w-full h-full object-cover z-10 rounded-3xl" alt="Preview" />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. 定制 */}
            <div className="apple-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-900">风格定制</h2>
                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">Step 2</span>
              </div>

              <div className="space-y-4">
                {/* 拍摄角度 */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block tracking-wider">拍摄角度</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="angle-btn option-btn active py-2.5 px-3 rounded-xl flex items-center gap-2">
                      <div className="icon-box w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs"><i className="fa-regular fa-id-badge"></i></div>
                      <span className="text-xs font-semibold">正面对视</span>
                    </button>
                    <button className="angle-btn option-btn py-2.5 px-3 rounded-xl flex items-center gap-2">
                      <div className="icon-box w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs"><i className="fa-solid fa-user-tag"></i></div>
                      <span className="text-xs font-semibold">微侧展示</span>
                    </button>
                  </div>
                </div>

                {/* 面部质感 */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block tracking-wider">面部质感</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="retouch-btn option-btn active py-2.5 px-3 rounded-xl flex items-center gap-2">
                      <div className="icon-box w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs"><i className="fa-solid fa-wand-magic-sparkles"></i></div>
                      <span className="text-xs font-semibold">精致美颜</span>
                    </button>
                    <button className="retouch-btn option-btn py-2.5 px-3 rounded-xl flex items-center gap-2">
                      <div className="icon-box w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs"><i className="fa-solid fa-camera"></i></div>
                      <span className="text-xs font-semibold">保留真实</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5 ml-1">深度磨皮美白，打造完美商业感。</p>
                </div>

                {/* 智能换装 */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block tracking-wider">智能换装</label>
                  <div className="space-y-2">
                    <button className="clothing-btn option-btn active w-full p-2 rounded-xl flex items-center gap-3">
                      <div className="icon-box w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center text-sm"><i className="fa-solid fa-user-tie"></i></div>
                      <div className="text-left"><div className="text-xs font-bold">商务正装</div><div className="text-[10px] text-slate-400">高端西装 / 职业套装</div></div>
                    </button>
                    <button className="clothing-btn option-btn w-full p-2 rounded-xl flex items-center gap-3">
                      <div className="icon-box w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center text-sm"><i className="fa-solid fa-graduation-cap"></i></div>
                      <div className="text-left"><div className="text-xs font-bold">美式博士</div><div className="text-[10px] text-slate-400">PhD 礼袍 / 绒面垂布</div></div>
                    </button>
                    <button className="clothing-btn option-btn w-full p-2 rounded-xl flex items-center gap-3">
                      <div className="icon-box w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center text-sm"><i className="fa-solid fa-shirt"></i></div>
                      <div className="text-left"><div className="text-xs font-bold">保持原样</div><div className="text-[10px] text-slate-400">仅优化光影，不换装</div></div>
                    </button>
                  </div>
                </div>

                {/* 背景色调 */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block tracking-wider">背景色调</label>
                  <div className="flex justify-between bg-slate-100/50 p-2 rounded-2xl">
                    <div className="color-swatch w-8 h-8 rounded-full cursor-pointer bg-white shadow-sm border border-slate-200 active-color" title="纯净白"></div>
                    <div className="color-swatch w-8 h-8 rounded-full cursor-pointer bg-gray-100 shadow-sm border border-slate-200" title="经典灰"></div>
                    <div className="color-swatch w-8 h-8 rounded-full cursor-pointer bg-[#1e3a8a] shadow-sm border border-slate-200" title="海军蓝"></div>
                    <div className="color-swatch w-8 h-8 rounded-full cursor-pointer bg-[#fef3c7] shadow-sm border border-slate-200" title="暖色调"></div>
                  </div>
                  <input type="hidden" defaultValue="Studio White" />
                  <p className="text-[10px] text-center text-slate-400 mt-1">当前: 纯净白</p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <button className="w-full bg-gradient-to-r from-slate-900 to-slate-800 hover:from-blue-600 hover:to-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-slate-200 hover:shadow-blue-200 transition-all flex items-center justify-center gap-2 transform active:scale-[0.98] group">
                  <span>生成证���照</span>
                  <i className="fa-solid fa-wand-magic-sparkles group-hover:animate-pulse"></i>
                </button>
                <p className="text-[10px] text-center mt-2 h-4 text-slate-400"></p>
              </div>
            </div>
          </div>

          {/* 右侧：预览区 */}
          <div className="lg:col-span-8 fade-in-up" style={{animationDelay: '0.2s'}}>
            <div className="apple-card p-1.5 h-full min-h-[600px] flex flex-col relative">
              <div className="absolute top-5 left-6 right-6 flex justify-between items-center z-10 pointer-events-none">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-white/80 backdrop-blur px-3 py-1 rounded-full shadow-sm">预览结果</h3>
                <div className="flex gap-2 pointer-events-auto">
                  <button className="text-[10px] text-slate-400 bg-white/80 backdrop-blur px-3 py-1.5 rounded-full hover:bg-white hover:text-slate-600 shadow-sm transition">DEBUG</button>
                  <button disabled className="bg-white/80 backdrop-blur text-slate-300 px-4 py-1.5 rounded-full text-xs font-bold shadow-sm transition-all flex items-center gap-2 hover:bg-white hover:text-blue-600 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
                    <i className="fa-solid fa-download"></i> 下载
                  </button>
                </div>
              </div>
              <div className="flex-grow bg-slate-50/50 rounded-[22px] border border-slate-100 relative overflow-hidden flex items-center justify-center">
                <div className="transition-all duration-500 ease-out p-8 flex items-center justify-center w-full h-full" style={{aspectRatio: '1/1', maxHeight: '700px'}}>
                  <div className="text-center space-y-4">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm border border-slate-50"><i className="fa-regular fa-image text-3xl text-slate-300"></i></div>
                    <div><p className="text-sm font-medium text-slate-500">暂无生成结果</p><p className="text-xs text-slate-400 mt-1">请上传照片并点击生成</p></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
