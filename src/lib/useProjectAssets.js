import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { downloadAsset, removeAssets, saveProjectExtras, uploadAsset } from './api'
import { MAX_ASSETS, spriteFileName } from './projectFiles'
import { prepareSprite } from './spriteUpload'
import { librarySprites } from '../curriculum/sprites'

/**
 * The sprites of one project: what is in the list, the pictures behind them,
 * and getting them to the runner.
 *
 * The list lives in projects.assets as [{ name, source, ref }]. A library
 * sprite's ref is its file on the site; an upload's ref is the path of the
 * object in storage. The bytes are fetched once and kept, because the editor
 * shows them as thumbnails and the runner needs them at every Run.
 */
export function useProjectAssets({ project, userId, reviewing, onError }) {
  const projectId = project?.id
  const [list, setList] = useState([])
  const [urls, setUrls] = useState({})          // name -> object URL, for thumbnails
  const [busy, setBusy] = useState(false)
  const bytes = useRef(new Map())               // name -> Promise<ArrayBuffer>
  const made = useRef([])                       // object URLs to give back

  // The list comes from the project when it loads.
  useEffect(() => {
    setList(Array.isArray(project?.assets) ? project.assets : [])
  }, [project])

  // Fetch whatever is not here yet. Library sprites come from the site; uploads
  // come from storage, with the child's own (or their teacher's) permission.
  useEffect(() => {
    list.forEach((asset) => {
      if (bytes.current.has(asset.name)) return

      const loading = (asset.source === 'library'
        ? fetch(`/sprites/${asset.ref}`).then((response) => {
          if (!response.ok) throw new Error(`status ${response.status}`)
          return response.blob()
        })
        : downloadAsset(asset.ref)
      ).then(async (blob) => {
        const url = URL.createObjectURL(blob)
        made.current.push(url)
        setUrls((current) => ({ ...current, [asset.name]: url }))
        return blob.arrayBuffer()
      })

      // A picture that will not load is not fatal: the program will say it
      // cannot find the file, which is the true and useful thing to hear.
      loading.catch(() => bytes.current.delete(asset.name))
      bytes.current.set(asset.name, loading)
    })
  }, [list])

  useEffect(() => () => made.current.forEach((url) => URL.revokeObjectURL(url)), [])

  const persist = useCallback(async (next) => {
    await saveProjectExtras(projectId, { assets: next })
    setList(next)
  }, [projectId])

  /** Put a library sprite in the project. */
  const addLibrary = useCallback(async (sprite) => {
    if (reviewing || list.some((asset) => asset.name === sprite.file)) return
    if (list.length >= MAX_ASSETS) return onError?.('sprite.tooMany')

    setBusy(true)
    try {
      await persist([...list, { name: sprite.file, source: 'library', ref: sprite.file }])
    } catch (error) {
      onError?.(error.message)
    } finally {
      setBusy(false)
    }
  }, [list, persist, reviewing, onError])

  /** Put a child's own picture in the project. Returns the file name it got. */
  const upload = useCallback(async (file) => {
    if (reviewing) return null
    if (list.length >= MAX_ASSETS) { onError?.('sprite.tooMany'); return null }

    setBusy(true)
    try {
      const { blob } = await prepareSprite(file)
      const name = spriteFileName(file.name, list.map((asset) => asset.name))
      const path = await uploadAsset(userId, projectId, name, blob)
      await persist([...list, { name, source: 'upload', ref: path }])
      return name
    } catch (error) {
      onError?.(error.message)
      return null
    } finally {
      setBusy(false)
    }
  }, [list, persist, reviewing, onError, userId, projectId])

  const remove = useCallback(async (name) => {
    if (reviewing) return
    const asset = list.find((item) => item.name === name)
    if (!asset) return

    setBusy(true)
    try {
      await persist(list.filter((item) => item.name !== name))
      if (asset.source === 'upload') await removeAssets([asset.ref]).catch(() => {})
      bytes.current.delete(name)
    } catch (error) {
      onError?.(error.message)
    } finally {
      setBusy(false)
    }
  }, [list, persist, reviewing, onError])

  /** Everything the runner needs: each sprite's name and its bytes. */
  const payload = useCallback(async () => {
    const loaded = await Promise.all(list.map(async (asset) => {
      try {
        return { name: asset.name, buffer: (await bytes.current.get(asset.name)).slice(0) }
      } catch {
        return null
      }
    }))
    return loaded.filter(Boolean)
  }, [list])

  return useMemo(
    () => ({ list, urls, busy, addLibrary, upload, remove, payload, library: librarySprites }),
    [list, urls, busy, addLibrary, upload, remove, payload]
  )
}
