import { useState, useRef, useEffect } from 'react'
import Head from 'next/head'
import styles from '../styles/Home.module.css'

export default function Home() {
  const [isMusicPlaying, setIsMusicPlaying] = useState(false)
  const audioRef = useRef(null)

  useEffect(() => {
    // Mencoba autoplay (diam, browser policy)
    if (audioRef.current) {
      audioRef.current.volume = 0.5
      // Autoplay saat pengguna pertama kali klik di halaman
      const playOnce = () => {
        audioRef.current?.play().catch(() => {})
        window.removeEventListener('click', playOnce)
      }
      window.addEventListener('click', playOnce)
    }
  }, [])

  const toggleMusic = () => {
    if (audioRef.current) {
      if (isMusicPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsMusicPlaying(!isMusicPlaying)
    }
  }

  const whatsappMessage = encodeURIComponent(
    "Halo, saya akan menghadiri acara Makan Bersama. Mohon info lebih lanjut."
  )
  const whatsappUrl = `https://wa.me/6283853124466?text=${whatsappMessage}`

  return (
    <>
      <Head>
        <title>Undangan Makan Bersama | Delyan & Putri</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:title" content="Undangan Makan Bersama" />
        <meta property="og:description" content="Kami mengundang Anda untuk hadir di acara Makan Bersama dalam rangka memperingati pernikahan kami." />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💐</text></svg>" />
      </Head>

      <div className={styles.container}>
        <div className={styles.card}>
          <img 
            src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 40'%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='30'%3E🌹🌸💐%3C/text%3E%3C/svg%3E"
            alt="Ornamen"
            className={styles.ornament}
          />
          
          <div className={styles.titleSection}>Dengan Hormat</div>
          
          <h1 className={styles.names}>
            Delyan <span className={styles.ampersand}>&amp;</span> Putri
          </h1>
          
          <h2 className={styles.eventName}>🍽️ Makan Bersama</h2>
          
          <p className={styles.desc}>
            Dalam rangka <strong>Memperingati Acara Pernikahan</strong> kami,<br />
            kami mengundang Bapak/Ibu/Saudara/i untuk hadir.
          </p>
          
          <div className={styles.details}>
            <div className={styles.detailRow}>
              <span className={styles.icon}>📅</span>
              <div>
                <span className={styles.label}>Hari & Tanggal</span>
                <span className={styles.value}>Minggu, 20 Mei 2026</span>
              </div>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.icon}>⏰</span>
              <div>
                <span className={styles.label}>Waktu</span>
                <span className={styles.value}>Pukul 18:00 WIB</span>
              </div>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.icon}>📍</span>
              <div>
                <span className={styles.label}>Lokasi</span>
                <span className={styles.value}>Jl. Anggrek No. 88, Jakarta Selatan</span>
              </div>
            </div>
          </div>
          
          <div className={styles.buttons}>
            <a 
              href={whatsappUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className={`${styles.btn} ${styles.whatsapp}`}
            >
              💬 Konfirmasi via WhatsApp
            </a>
            <a 
              href="mailto:delyan754@gmail.com" 
              className={`${styles.btn} ${styles.email}`}
            >
              ✉️ Kirim Ucapan
            </a>
          </div>
          
          <p style={{ marginTop: '2rem', fontSize: '0.85rem', color: '#777' }}>
            Merupakan suatu kehormatan dan kebahagiaan apabila Anda berkenan hadir.
          </p>
        </div>

        {/* Musik latar opsional */}
        <audio ref={audioRef} loop>
          <source src="/music.mp3" type="audio/mpeg" />
          {/* Jika tidak ada file music.mp3, tidak masalah */}
        </audio>

        <button className={styles.musicToggle} onClick={toggleMusic} aria-label="Toggle music">
          {isMusicPlaying ? '🔊' : '🔇'}
        </button>
      </div>
    </>
  )
}
