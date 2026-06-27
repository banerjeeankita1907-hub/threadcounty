'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useDropzone } from 'react-dropzone'
import toast, { Toaster } from 'react-hot-toast'

// 🔴 REPLACE THESE WITH YOUR REAL SUPABASE URL AND ANON KEY
const supabase = createClient(
  'https://YOUR_PROJECT_ID.supabase.co',
  'YOUR_ANON_KEY'
)

export default function Page() {
  const [session, setSession] = useState<any>(null)
  const [page, setPage] = useState('home')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [reports, setReports] = useState<any[]>([])
  const [selectedReport, setSelectedReport] = useState<any>(null)
  const [totalUsers, setTotalUsers] = useState(0)
  const [totalReports, setTotalReports] = useState(0)
  const [users, setUsers] = useState<any[]>([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    supabase.auth.onAuthStateChange((_event, session) => setSession(session))
  }, [])

  // Auth
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) toast.error(error.message)
    else setPage('dashboard')
  }
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) return toast.error(error.message)
    if (data.user) {
      await supabase.from('profiles').insert({ id: data.user.id, full_name: name })
      toast.success('Account created!')
      setPage('dashboard')
    }
  }
  const handleLogout = async () => {
    await supabase.auth.signOut()
    setPage('home')
  }

  // Upload
  const onDrop = (acceptedFiles: File[]) => {
    const f = acceptedFiles[0]
    if (f) { setFile(f); setPreview(URL.createObjectURL(f)) }
  }
  const { getRootProps, getInputProps } = useDropzone({ onDrop, accept: {'image/*':[]}, maxFiles:1 })
  const handleUpload = async () => {
    if (!file || !session) return
    const user = session.user
    const filePath = `${user.id}/${Date.now()}-${file.name}`
    const { error } = await supabase.storage.from('fabric-images').upload(filePath, file)
    if (error) return toast.error('Upload failed')
    const { data: uploadData } = await supabase.from('uploads').insert({
      user_id: user.id, file_path: filePath, file_name: file.name, file_size: file.size
    }).select().single()
    const { data: publicUrlData } = supabase.storage.from('fabric-images').getPublicUrl(filePath)
    const imageUrl = publicUrlData.publicUrl
    // Mock AI
    const analysis = {
      thread_density: (Math.random()*120+80).toFixed(1),
      warp_count: Math.floor(Math.random()*50+30),
      weft_count: Math.floor(Math.random()*50+20),
      fabric_type: ['Plain Weave','Twill Weave','Satin Weave'][Math.floor(Math.random()*3)],
      confidence_score: (Math.random()*7+92).toFixed(1),
      suggestions: 'Fabric appears uniform.'
    }
    const { data: report } = await supabase.from('reports').insert({
      user_id: user.id, upload_id: uploadData.id, image_url: imageUrl, ...analysis
    }).select().single()
    toast.success('Analysis complete!')
    setSelectedReport(report)
    setPage('results')
  }

  // Load data
  const loadReports = async () => {
    if (!session) return
    const { data } = await supabase.from('reports').select('*').eq('user_id', session.user.id).order('created_at',{ascending:false})
    setReports(data || [])
  }
  const loadAdmin = async () => {
    const { count: u } = await supabase.from('profiles').select('*', { count:'exact', head:true })
    const { count: r } = await supabase.from('reports').select('*', { count:'exact', head:true })
    const { data: users } = await supabase.from('profiles').select('*').limit(10)
    setTotalUsers(u || 0)
    setTotalReports(r || 0)
    setUsers(users || [])
  }

  useEffect(() => {
    if (page === 'dashboard' || page === 'history') loadReports()
    if (page === 'admin') loadAdmin()
  }, [page, session])

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster />
      {/* Navbar */}
      <nav className="bg-white shadow p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600 cursor-pointer" onClick={()=>setPage('home')}>ThreadCounty</h1>
        <div className="flex gap-2">
          {!session ? (
            <>
              <button className="px-4 py-2 text-sm border rounded" onClick={()=>setPage('login')}>Login</button>
              <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded" onClick={()=>setPage('signup')}>Sign Up</button>
            </>
          ) : (
            <>
              <button className="px-3 py-1 text-sm" onClick={()=>setPage('dashboard')}>Dashboard</button>
              <button className="px-3 py-1 text-sm" onClick={()=>setPage('upload')}>Upload</button>
              <button className="px-3 py-1 text-sm" onClick={()=>setPage('history')}>History</button>
              <button className="px-3 py-1 text-sm" onClick={handleLogout}>Logout</button>
            </>
          )}
        </div>
      </nav>

      {/* Pages */}
      <div className="p-6 max-w-4xl mx-auto">
        {page === 'home' && (
          <div className="text-center mt-20">
            <h2 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">AI-Powered Textile Analysis</h2>
            <p className="mt-4 text-lg text-gray-600">Upload fabric images and get instant thread density and weave reports.</p>
            <button className="mt-8 px-6 py-3 bg-blue-600 text-white rounded-lg text-lg" onClick={()=>setPage(session?'upload':'signup')}>Get Started</button>
            <div className="mt-16 grid md:grid-cols-3 gap-6 text-left">
              <div className="p-4 bg-white rounded shadow"><h3 className="font-semibold">AI Analysis</h3><p className="text-sm text-gray-500">Warp/weft count, density.</p></div>
              <div className="p-4 bg-white rounded shadow"><h3 className="font-semibold">Reports</h3><p className="text-sm text-gray-500">Instant PDF-ready results.</p></div>
              <div className="p-4 bg-white rounded shadow"><h3 className="font-semibold">History</h3><p className="text-sm text-gray-500">Review all past analyses.</p></div>
            </div>
          </div>
        )}

        {page === 'login' && (
          <form onSubmit={handleLogin} className="max-w-sm mx-auto mt-20 space-y-4">
            <h2 className="text-2xl font-bold text-center">Login</h2>
            <input className="w-full border p-2 rounded" type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required />
            <input className="w-full border p-2 rounded" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required />
            <button className="w-full py-2 bg-blue-600 text-white rounded" type="submit">Login</button>
          </form>
        )}

        {page === 'signup' && (
          <form onSubmit={handleSignup} className="max-w-sm mx-auto mt-20 space-y-4">
            <h2 className="text-2xl font-bold text-center">Sign Up</h2>
            <input className="w-full border p-2 rounded" placeholder="Full Name" value={name} onChange={e=>setName(e.target.value)} required />
            <input className="w-full border p-2 rounded" type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required />
            <input className="w-full border p-2 rounded" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required />
            <button className="w-full py-2 bg-blue-600 text-white rounded" type="submit">Sign Up</button>
          </form>
        )}

        {page === 'dashboard' && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Dashboard</h2>
            <p>Welcome, {session?.user?.email}</p>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="p-4 bg-white rounded shadow">Reports: {reports.length}</div>
              <div className="p-4 bg-white rounded shadow">Uploads: {reports.length}</div>
            </div>
          </div>
        )}

        {page === 'upload' && (
          <div className="max-w-md mx-auto mt-10">
            <h2 className="text-xl font-bold mb-4">Upload Fabric Image</h2>
            <div {...getRootProps()} className="border-2 border-dashed p-8 text-center cursor-pointer rounded">
              <input {...getInputProps()} />
              {preview ? <img src={preview} alt="preview" className="max-h-48 mx-auto" /> : <p>Drag & drop image here</p>}
            </div>
            {file && <button className="mt-4 w-full py-2 bg-blue-600 text-white rounded" onClick={handleUpload}>Analyze</button>}
          </div>
        )}

        {page === 'results' && selectedReport && (
          <div className="mt-10">
            <h2 className="text-2xl font-bold mb-4">Analysis Results</h2>
            <div className="grid grid-cols-2 gap-4">
              <img src={selectedReport.image_url} className="rounded" />
              <div className="space-y-2">
                <p><strong>Thread Density:</strong> {selectedReport.thread_density} threads/cm²</p>
                <p><strong>Warp Count:</strong> {selectedReport.warp_count}</p>
                <p><strong>Weft Count:</strong> {selectedReport.weft_count}</p>
                <p><strong>Fabric Type:</strong> {selectedReport.fabric_type}</p>
                <p><strong>Confidence:</strong> {selectedReport.confidence_score}%</p>
                <p><strong>Suggestions:</strong> {selectedReport.suggestions}</p>
              </div>
            </div>
          </div>
        )}

        {page === 'history' && (
          <div>
            <h2 className="text-2xl font-bold mb-4">History</h2>
            {reports.map(r => (
              <div key={r.id} className="p-3 bg-white shadow rounded mb-2 flex justify-between">
                <span>{r.fabric_type} ({r.confidence_score}%)</span>
                <button onClick={()=>{setSelectedReport(r); setPage('results')}} className="text-blue-600">View</button>
              </div>
            ))}
          </div>
        )}

        {page === 'admin' && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Admin Dashboard</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded shadow">Total Users: {totalUsers}</div>
              <div className="p-4 bg-white rounded shadow">Total Reports: {totalReports}</div>
            </div>
            <h3 className="mt-6 font-semibold">Recent Users</h3>
            {users.map(u => <div key={u.id} className="p-2 border-b">{u.full_name || u.id}</div>)}
          </div>
        )}
      </div>
    </div>
  )
}
