import { useState, useEffect } from 'react'
import './App.css'

function App() {
  // Stati principali
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [importText, setImportText] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('review')

  // Argomenti
  const [topics, setTopics] = useState(() => JSON.parse(localStorage.getItem('topics') || '[]'))
  const [newTopicName, setNewTopicName] = useState('')
  const [pendingDeleteTopic, setPendingDeleteTopic] = useState(null)
  const [deleteTopicName, setDeleteTopicName] = useState('')
  const [filterTopic, setFilterTopic] = useState('')

  // Flashcard
  const [flashcards, setFlashcards] = useState(() => JSON.parse(localStorage.getItem('flashcards') || '[]'))
  const today = new Date().toISOString().split('T')[0]
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showBack, setShowBack] = useState(false)
  const [selectedScore, setSelectedScore] = useState(null)

  // Persistenza
  useEffect(() => { localStorage.setItem('topics', JSON.stringify(topics)) }, [topics])
  useEffect(() => { localStorage.setItem('flashcards', JSON.stringify(flashcards)) }, [flashcards])

  // Menu laterale
  const toggleMenu = () => setMenuOpen(open => !open)
  const changeSection = sec => {
    setActiveSection(sec)
    setFilterTopic('')
    setCurrentIndex(0)
    setShowBack(false)
    setSelectedScore(null)
    setMenuOpen(false)
  }

  // Gestione argomenti
  const addTopic = () => {
    const name = newTopicName.trim()
    if (name && !topics.includes(name)) {
      setTopics(prev => [...prev, name])
      setNewTopicName('')
    }
  }
  const confirmDeleteTopic = topic => {
    if (window.confirm(`Sei sicuro di voler eliminare l'argomento "${topic}"? Verranno eliminate anche tutte le flashcard associate.`)) {
      setPendingDeleteTopic(topic)
    }
  }
  const finalizeDeleteTopic = () => {
    if (deleteTopicName === 'Elimina' && pendingDeleteTopic) {
      setTopics(prev => prev.filter(t => t !== pendingDeleteTopic))
      setFlashcards(prev => prev.filter(c => c.topic !== pendingDeleteTopic))
      setPendingDeleteTopic(null)
      setDeleteTopicName('')
    } else {
      alert('Digita "Elimina" per confermare')
    }
  }
  const cancelDeleteTopic = () => {
    setPendingDeleteTopic(null)
    setDeleteTopicName('')
  }

  // Import / Export JSON
  const handleImport = () => {
    try {
      const arr = JSON.parse(importText)
      if (!Array.isArray(arr)) throw new Error()
      const newTopics = [...new Set(arr.map(c => c.topic).filter(Boolean))]
      setTopics(prev => [...prev, ...newTopics.filter(t => !prev.includes(t))])
      const imported = arr.filter(c => c.front && c.back).map(c => ({
        front: c.front,
        back: c.back,
        topic: c.topic || '',
        level: 0,
        nextReview: today
      }))
      setFlashcards(prev => [...prev, ...imported])
      setImportText('')
    } catch {
      alert('Formato JSON non valido')
    }
  }
  const handleExport = () => {
    const data = flashcards.map(({ front, back, topic }) => ({ front, back, topic }))
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'flashcards.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Spaced Repetition
  const due = flashcards.filter(c => c.nextReview <= today).map((c, i) => ({ ...c, index: i }))
  const trainList = filterTopic ? flashcards.filter(c => c.topic === filterTopic) : flashcards
  const currentList = activeSection === 'review' ? due : activeSection === 'train' ? trainList : []
  const currentCard = currentList[currentIndex] || {}

  const nextCard = () => {
    if (!currentList.length) return
    setCurrentIndex(i => (i + 1) % currentList.length)
    setShowBack(false)
    setSelectedScore(null)
  }
  const prevCard = () => {
    if (!currentList.length) return
    setCurrentIndex(i => (i - 1 + currentList.length) % currentList.length)
    setShowBack(false)
    setSelectedScore(null)
  }

  const handleReview = (idx, score) => {
    setSelectedScore(score)
    setFlashcards(prev => prev.map((card, i) => {
      if (i !== idx) return card
      let offset = 0
      switch (score) {
        case 1: offset = 0; break
        case 2: offset = 2 * 3600000; break
        case 3: offset = 24 * 3600000; break
        case 4: offset = 5 * 24 * 3600000; break
        case 5: offset = 11 * 24 * 3600000; break
      }
      const next = new Date(Date.now() + offset).toISOString().split('T')[0]
      return { ...card, level: score, nextReview: next }
    }))
  }

  const countByTopic = t => flashcards.filter(c => c.topic === t).length
  const getBorderColor = s => ({1:'red',2:'orange',3:'yellow',4:'lightgreen',5:'green'})[s] || '#ccc'

  // Eliminazione flashcard con conferma
  const handleDeleteCard = i => {
    if (window.confirm('Sei sicuro di voler eliminare questa flashcard?')) {
      setFlashcards(prev => prev.filter((_, idx) => idx !== i))
    }
  }

  // Modifica flashcard
  const handleEditCard = idx => {
    const card = flashcards[idx]
    setFront(card.front)
    setBack(card.back)
    setFilterTopic(card.topic)
    setActiveSection('add')
  }

  // Componente Carta
  const Card = ({ card, showRating, showActions }) => (
    <div onClick={e => { if (e.target.closest('.no-flip')) return; setShowBack(b => !b) }}
         style={{ border: '1px solid #555', padding: 16, borderRadius: 8, background: '#1e1e1e', cursor: 'pointer' }}>
      <p style={{ color: '#888', margin: 0 }}>Domanda:</p>
      <p style={{ fontWeight: 'bold', fontSize: 18, margin: '4px 0' }}>{card.front}</p>
      {showBack && <>      
        <p style={{ color: '#888', marginTop: 12, marginBottom: 4 }}>Risposta:</p>
        <p style={{ margin: 0 }}>{card.back}</p>
        {showRating && <div className='no-flip' style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {[1,2,3,4,5].map(s => (
            <button key={s} onClick={e => { e.stopPropagation(); handleReview(card.index, s) }}
                    style={{ border: selectedScore===s?`2px solid ${getBorderColor(s)}`:'1px solid #888', padding: '4px 8px', borderRadius:4, background:'transparent', color:'white', cursor:'pointer' }}>
              {s}
            </button>
          ))}
        </div>}
        <div className='no-flip' style={{ display:'flex', justifyContent:'space-between', marginTop:16 }}>
          <button onClick={e => { e.stopPropagation(); prevCard() }}>Precedente</button>
          <button onClick={e => { e.stopPropagation(); nextCard() }}>Prossima</button>
        </div>
      </>}
      {showActions && <div className='no-flip' style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button onClick={() => handleEditCard(card.index)} style={{ flex:1, padding:'8px', background:'transparent', border:'1px solid #888', borderRadius:4, cursor:'pointer' }}>Modifica</button>
        <button onClick={() => handleDeleteCard(card.index)} style={{ flex:1, padding:'8px', background:'transparent', border:'1px solid #888', borderRadius:4, cursor:'pointer' }}>Elimina</button>
      </div>}
    </div>
  )

  return (
    <div style={{ fontFamily: 'sans-serif', background: '#121212', minHeight: '100vh', color: 'white' }}>
      {/* Header */}
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: 60, background: '#1f2d3d', display: 'flex', alignItems: 'center', padding: '0 16px', zIndex: 10 }}>
        <button onClick={toggleMenu} style={{ fontSize:24, background:'none', border:'none', color:'white', cursor:'pointer', marginRight:16 }}>☰</button>
        <h1 style={{ margin:0 }}>Flashcards</h1>
      </div>

      {/* Menu Laterale */}
      {menuOpen && (
        <div style={{ position:'fixed', top:60, left:0, width:220, background:'#1e1e1e', padding:16, height:'100vh', boxShadow:'2px 0 8px rgba(0,0,0,0.3)' }}>
          {['review','train','all','add','topics'].map(sec => {
            const labels = { review:'Da ripassare', train:'Allenamento', all:'Tutte', add:'Aggiungi', topics:'Argomenti' }
            return <p key={sec} onClick={() => changeSection(sec)} style={{ cursor:'pointer', textAlign:'left', margin:'8px 0' }}>{labels[sec]}</p>
          })}
        </div>
      )}

      {/* Contenuto */}
      <div style={{ marginTop:80, maxWidth:600, margin:'0 auto', padding:16 }}>
        {activeSection==='review' && (
          <>
            <h2>📅 Da ripassare oggi ({today})</h2>
            {due.length ? <Card card={currentCard} showRating={true} showActions={false}/> : <p>Nessuna flashcard da ripassare oggi.</p>}
          </>
        )}
        {activeSection==='train' && (
          <>
            <h2>🏋️ Allenamento libero</h2>
            {!filterTopic ? (
              <ul style={{ listStyle:'none', padding:0 }}>
                {topics.map(t => (
                  <li key={t} style={{ margin:'8px 0' }}>
                    <button onClick={() => setFilterTopic(t)} style={{ width:'100%', display:'flex', justifyContent:'space-between', padding:'8px', border:'1px solid #888', borderRadius:4, background:'transparent', cursor:'pointer' }}>
                      <span>{t}</span><span>{countByTopic(t)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <>
                <h3 style={{ fontWeight:'bold', marginBottom:16 }}>{filterTopic}</h3>
                <Card card={currentCard} showRating={false} showActions={false}/>
                <div style={{ textAlign:'center', marginTop:16 }}>
                  <button onClick={() => setFilterTopic('')} style={{ padding:'8px 12px', border:'1px solid #888', borderRadius:4, background:'transparent', cursor:'pointer' }}>🔙 Tutti gli argomenti</button>
                </div>
              </>
            )}
          </>
        )}
        {activeSection==='all' && (
          <>
            <h2>🗂️ Tutte le flashcard</h2>
            <ul style={{ listStyle:'none', padding:0 }}>
              {flashcards.map((c, i) => (
                <li key={i} style={{ background:'#2a2a2a', padding:16, margin:'8px 0', borderRadius:6 }}>
                  <p><strong>Argomento:</strong> {c.topic||'–'}</p>
                  <p><strong>Fronte:</strong> {c.front}</p>
                  <p><strong>Retro:</strong> {c.back}</p>
                  <p><strong>Livello:</strong> {c.level}</p>
                  <p><strong>Prossimo:</strong> {c.nextReview}</p>
                  <div style={{ display:'flex', gap:8, marginTop:16 }}>
                    <button onClick={() => handleEditCard(i)} style={{ flex:1, padding:'8px', background:'transparent', border:'1px solid #888', borderRadius:4, cursor:'pointer' }}>Modifica</button>
                    <button onClick={() => handleDeleteCard(i)} style={{ flex:1, padding:'8px', background:'transparent', border:'1px solid #888', borderRadius:4, cursor:'pointer' }}>Elimina</button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
        {activeSection==='add' && (
          <>
            <h2>➕ Aggiungi</h2>
            <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:24 }}>
              <select value={filterTopic} onChange={e => setFilterTopic(e.target.value)} style={{ padding:8 }}>
                <option value=''>Senza argomento</option>
                {topics.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input placeholder='Fronte' value={front} onChange={e => setFront(e.target.value)} style={{ padding:8 }} />
              <input placeholder='Retro' value={back} onChange={e => setBack(e.target.value)} style={{ padding:8 }} />
              <button onClick={() => {
                if (front && back) {
                  setFlashcards(prev => [...prev, { front, back, topic:filterTopic, level:0, nextReview:today }])
                  setFront('')
                  setBack('')
                }
              }} style={{ padding:'8px', background:'transparent', border:'1px solid #888', borderRadius:4, cursor:'pointer' }}>Aggiungi</button>
            </div>
            <h2>📥 Importa JSON</h2>
            <textarea rows={4} value={importText} onChange={e => setImportText(e.target.value)} style={{ width:'100%', padding:8, fontFamily:'monospace' }} />
            <button onClick={handleImport} style={{ marginTop:8, padding:'8px', background:'transparent', border:'1px solid #888', borderRadius:4, cursor:'pointer' }}>Importa</button>
            <h2>📤 Esporta</h2>
            <button onClick={handleExport} style={{ padding:'8px', background:'transparent', border:'1px solid #888', borderRadius:4, cursor:'pointer' }}>Esporta TXT</button>
          </>
        )}
        {activeSection==='topics' && (
          <>
            <h2>📚 Argomenti</h2>
            <div style={{ display:'flex', gap:8, marginBottom:16 }}>
              <input placeholder='Nuovo argomento' value={newTopicName} onChange={e => setNewTopicName(e.target.value)} style={{ flex:1, padding:8 }} />
              <button onClick={addTopic} style={{ padding:'8px', background:'transparent', border:'1px solid #888', borderRadius:4, cursor:'pointer' }}>Crea</button>
            </div>
            {pendingDeleteTopic && (
              <div style={{ marginBottom:16 }}>
                <p>Digita <strong>Elimina</strong> per cancellare "{pendingDeleteTopic}"</p>
                <input placeholder='Elimina' value={deleteTopicName} onChange={e => setDeleteTopicName(e.target.value)} style={{ padding:8, marginRight:8 }} />
                <button onClick={finalizeDeleteTopic} style={{ padding:'8px', background:'transparent', border:'1px solid #888', borderRadius:4, cursor:'pointer' }}>Elimina</button>
                <button onClick={cancelDeleteTopic} style={{ padding:'8px', background:'transparent', border:'1px solid #888', borderRadius:4, cursor:'pointer' }}>Annulla</button>
              </div>
            )}
            <ul style={{ listStyle:'none', padding:0 }}>
              {topics.map((t, i) => (
                <li key={i} style={{ display:'flex', justifyContent:'space-between', margin:'8px 0' }}>
                  <span>{t}</span>
                  <button onClick={() => confirmDeleteTopic(t)} style={{ padding:'8px', background:'transparent', border:'1px solid #888', borderRadius:4, cursor:'pointer' }}>Elimina</button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}

export default App
