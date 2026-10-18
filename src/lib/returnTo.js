import { useLocation, useNavigate } from 'react-router-dom'

/**
 * Opening a project and coming back to where you were.
 *
 * The editors sit outside the shell, so leaving one used to mean "go home".
 * For a pupil that is fine; for a teacher who opened a project from one child's
 * page, in one class, it throws away all of that and starts over at the top.
 *
 * So whoever opens a project says where it was opened from, and the editor
 * reads that when its Back button is pressed. The place is a plain URL, which
 * is why the teacher screens keep their class, tab and child in the address.
 */

/** Open a project, remembering this page as the way back. */
export function useOpenProject() {
  const navigate = useNavigate()
  const location = useLocation()

  return (project, search = '') =>
    navigate(`/${project.kind}/${project.id}${search}`, {
      state: { from: location.pathname + location.search }
    })
}

/** Where Back should go: where the project was opened from, else the home screen. */
export function useBackTarget() {
  const { state } = useLocation()
  return typeof state?.from === 'string' ? state.from : '/'
}
