import Layout from './ui/Layout'
import Scene from './visualization/Scene'
import { SelectionProvider } from './contexts/SelectionContext'

function App() {
    return (
        <SelectionProvider>
            <Layout>
                <Scene />
            </Layout>
        </SelectionProvider>
    )
}

export default App
