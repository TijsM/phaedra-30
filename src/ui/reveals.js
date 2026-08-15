/**
 * Secties die binnenschuiven zodra ze in beeld komen, en een
 * hoofdstukbalkje links dat meeloopt met waar je bent.
 */
export function initReveals() {
  const sections = [...document.querySelectorAll('.sec')]
  if (!sections.length) return () => {}

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible')
          // één keer is genoeg — anders flikkert het bij heen-en-weer scrollen
          io.unobserve(e.target)
        }
      }
    },
    { rootMargin: '-12% 0px -18% 0px', threshold: 0.01 },
  )
  sections.forEach((s) => io.observe(s))

  // de hero staat er meteen op
  document.querySelector('.sec--hero')?.classList.add('is-visible')

  return () => io.disconnect()
}

export function initChapters(scroll) {
  const links = [...document.querySelectorAll('.chapters a')]
  if (!links.length) return () => {}

  const targets = links
    .map((a) => ({ a, el: document.querySelector(a.getAttribute('href')) }))
    .filter((x) => x.el)

  for (const { a, el } of targets) {
    a.addEventListener('click', (e) => {
      e.preventDefault()
      scroll.scrollTo(el)
    })
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const hit = targets.find((x) => x.el === e.target)
        if (!hit) continue
        if (e.isIntersecting) {
          links.forEach((l) => l.classList.remove('is-active'))
          hit.a.classList.add('is-active')
        }
      }
    },
    { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
  )
  targets.forEach(({ el }) => io.observe(el))

  return () => io.disconnect()
}
