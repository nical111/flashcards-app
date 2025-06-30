import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [editIndex, setEditIndex] = useState(null)
  const [importText, setImportText] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('review')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showBack, setShowBack] = useState(false)
  const [selectedScore, setSelectedScore] = useState(null)
  const [flashcards, setFlashcards] = useState(() => {
    const saved = localStorage.getItem('flashcards')
    return saved ? JSON.parse(saved) : []
  })

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    localStorage.setItem('flashcards', JSON.stringify(flashcards))
  }, [flashcards])

  const handleAddCard = () => {
    if (!front.trim() || !back.trim()) return
    if (editIndex !== null) {
      const updatedCards = [...flashcards]
      updatedCards[editIndex] = { ...updatedCards[editIndex], front, back }
      setFlashcards(updatedCards)
      setEditIndex(null)
    } else {
      const newCard = {
        front,
        back,
        level: 0,
        nextReview: today
      }
      setFlashcards(prev => [...prev, newCard])
    }
    setFront('')
    setBack('')
  }

  const handleDelete = (index) => {
    if (window.confirm('Sei sicuro di voler eliminare questa flashcard?')) {
      setFlashcards(prev => prev.filter((_, i) => i !== index))
    }
  }

  const handleEdit = (index) => {
    setFront(flashcards[index].front)
    setBack(flashcards[index].back)
    setEditIndex(index)
    setActiveSection('add')
  }

  const handleReview = (index, score) => {
    setSelectedScore(score)
    setFlashcards(prev => {
      const updated = prev.map((card, i) => {
        if (i !== index) return card
        const newLevel = Math.min(Math.max(score, 0), 5)
        const intervals = [1, 2, 4, 7, 14, 30]
        const nextDate = new Date()
        nextDate.setDate(nextDate.getDate() + intervals[newLevel])
        return {
          ...card,
          level: newLevel,
          nextReview: nextDate.toISOString().split('T')[0]
        }
      })
      return updated
    })
  }

  const handleImport = () => {
    try {
      const parsed = JSON.parse(importText)
      if (Array.isArray(parsed)) {
        const validCards = parsed
          .filter(card => card.front && card.back)
          .map(card => ({
            front: card.front,
            back: card.back,
            level: 0,
            nextReview: today
          }))
        setFlashcards(prev => [...prev, ...validCards])
        setImportText('')
      } else {
        alert("Il JSON deve essere un array di oggetti con 'front' e 'back'")
      }
    } catch (e) {
      alert('Formato JSON non valido')
    }
  }

  const handleExportJSON = () => {
    const data = JSON.stringify(flashcards.map(({ front, back }) => ({ front, back })), null, 2)
    const blob = new Blob([data], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'flashcards.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  const toggleMenu = () => setMenuOpen(prev => !prev)
  const changeSection = (section) => {
    setActiveSection(section)
    setCurrentIndex(0)
    setShowBack(false)
    setSelectedScore(null)
    setMenuOpen(false)
  }

  const cardsDue = flashcards
    .map((card, index) => ({ ...card, index }))
    .filter(card => card.nextReview <= today)

  const currentList = activeSection === 'review' ? cardsDue : flashcards
  const currentCard = currentList[currentIndex]

  const handleNextCard = () => {
    setCurrentIndex((currentIndex + 1) % currentList.length)
    setShowBack(false)
    setSelectedScore(null)
  }

  const handlePrevCard = () => {
    setCurrentIndex((currentIndex - 1 + currentList.length) % currentList.length)
    setShowBack(false)
    setSelectedScore(null)
  }

  const getBorderColor = (score) => {
    switch (score) {
      case 1: return 'red'
      case 2: return 'orange'
      case 3: return 'yellow'
      case 4: return 'lightgreen'
      case 5: return 'green'
      default: return '#ccc'
    }
  }

  const CardComponent = ({ card, onReview }) => (
    <div
      style={{ border: '1px solid #555', padding: '1.5rem', borderRadius: '8px', background: '#1e1e1e', cursor: 'pointer' }}
      onClick={(e) => {
        if (e.target.closest('.no-flip')) return
        setShowBack(prev => !prev)
      }}
    >
      <p style={{ color: '#888', marginBottom: '0.5rem' }}>Domanda:</p>
      <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{card.front}</p>
      {showBack && (
        <>
          <p style={{ color: '#888', marginTop: '1rem' }}>Risposta:</p>
          <p style={{ fontSize: '1.1rem' }}>{card.back}</p>
          <p style={{ marginTop: '1rem' }}>Quanto bene la ricordavi?</p>
          <div className="no-flip" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {[1, 2, 3, 4, 5].map(score => (
              <button
                key={score}
                onClick={(e) => {
                  e.stopPropagation()
                  handleReview(card.index ?? currentIndex, score)
                }}
                style={{
                  padding: '0.5rem 1rem',
                  border: selectedScore === score ? `2px solid ${getBorderColor(score)}` : '1px solid #888',
                  background: 'transparent',
                  color: 'white',
                  cursor: 'pointer',
                  borderRadius: '4px'
                }}
              >
                {score}
              </button>
            ))}
          </div>
        </>
      )}
      <div className="no-flip" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={(e) => { e.stopPropagation(); handlePrevCard(); }}>Precedente</button>
        <button onClick={(e) => { e.stopPropagation(); handleNextCard(); }}>Prossima</button>
      </div>
    </div>
  )

  return (
    <div style={{ fontFamily: 'sans-serif', background: '#121212', minHeight: '100vh', color: 'white' }}>
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '60px', background: '#1f2d3d', color: 'white', display: 'flex', alignItems: 'center', padding: '0 1rem', zIndex: 10 }}>
        <button onClick={toggleMenu} style={{ fontSize: '1.8rem', background: 'none', border: 'none', color: 'white', cursor: 'pointer', marginRight: '1rem' }}>☰</button>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Flashcards</h1>
      </div>

      {menuOpen && (
        <div style={{ position: 'fixed', top: '60px', left: 0, width: '220px', background: '#1e1e1e', padding: '1rem', color: 'white', height: '100vh', zIndex: 5, boxShadow: '2px 0 8px rgba(0,0,0,0.3)' }}>
          <p style={{ cursor: 'pointer', marginBottom: '1rem' }} onClick={() => changeSection('review')}>📅 Da ripassare oggi</p>
          <p style={{ cursor: 'pointer', marginBottom: '1rem' }} onClick={() => changeSection('train')}>🏋️ Allenamento libero</p>
          <p style={{ cursor: 'pointer', marginBottom: '1rem' }} onClick={() => changeSection('all')}>🗂️ Tutte le flashcard</p>
          <p style={{ cursor: 'pointer' }} onClick={() => changeSection('add')}>➕ Aggiungi / importa</p>
        </div>
      )}

      <div style={{ marginTop: '80px', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto', padding: '1rem' }}>
        {activeSection === 'review' && (
          <>
            <h2>📅 Da ripassare oggi ({today})</h2>
            {cardsDue.length > 0 ? (
              <CardComponent card={currentCard} onReview={handleReview} />
            ) : (
              <p>Nessuna flashcard da ripassare oggi.</p>
            )}
          </>
        )}

        {activeSection === 'train' && (
          <>
            <h2>🏋️ Allenamento libero</h2>
            {flashcards.length > 0 ? (
              <CardComponent card={currentCard} onReview={handleReview} />
            ) : (
              <p>Non ci sono flashcard.</p>
            )}
          </>
        )}

        {activeSection === 'all' && (
          <>
            <h2>🗂️ Tutte le flashcard</h2>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {flashcards.map((card, index) => (
                <li key={index} style={{ border: '1px solid #444', padding: '1rem', marginBottom: '0.5rem', borderRadius: '6px', background: '#2a2a2a' }}>
                  <strong>Fronte:</strong> {card.front}<br />
                  <strong>Retro:</strong> {card.back}<br />
                  <strong>Livello:</strong> {card.level}<br />
                  <strong>Prossimo ripasso:</strong> {card.nextReview}<br />
                  <button onClick={() => handleEdit(index)}>✏️ Modifica</button>
                  <button onClick={() => handleDelete(index)}>🗑️ Elimina</button>
                </li>
              ))}
            </ul>
          </>
        )}

        {activeSection === 'add' && (
          <>
            <h2>➕ Aggiungi una flashcard</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
              <input type="text" placeholder="Fronte" value={front} onChange={(e) => setFront(e.target.value)} style={{ padding: '0.5rem' }} />
              <input type="text" placeholder="Retro" value={back} onChange={(e) => setBack(e.target.value)} style={{ padding: '0.5rem' }} />
              <button onClick={handleAddCard}>{editIndex !== null ? '💾 Salva modifiche' : '➕ Aggiungi flashcard'}</button>
            </div>

            <h2>📥 Importa da ChatGPT (JSON)</h2>
            <textarea rows="6" placeholder='Incolla qui il JSON delle flashcard...' value={importText} onChange={(e) => setImportText(e.target.value)} style={{ width: '100%', fontFamily: 'monospace', padding: '1rem', boxSizing: 'border-box' }} />
            <button onClick={handleImport}>📩 Importa flashcard</button>

            <h2>📤 Esporta flashcard</h2>
            <button onClick={handleExportJSON}>📝 Esporta come TXT (copiabile)</button>
          </>
        )}
      </div>
    </div>
  )
}

export default App
