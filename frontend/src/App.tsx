import Layout from './ui/Layout'
import Scene from './visualization/Scene'
import { SelectionProvider } from './contexts/SelectionContext'
import { ErrorBoundary } from './components/ErrorBoundary'

function App() {
    return (
        <ErrorBoundary>
            <SelectionProvider>
                <Layout>
                    <Scene />
                </Layout>
            </SelectionProvider>
        </ErrorBoundary>
    )
}

export default App
