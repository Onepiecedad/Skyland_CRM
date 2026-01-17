import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Today } from './pages/Today';
import { Messages } from './pages/Messages';
import { CustomerList } from './pages/CustomerList';
import { CustomerDetail } from './pages/CustomerDetail';
import { Header } from './components/Header';

function App() {
    return (
        <div className="min-h-screen bg-background">
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<Login />} />

                    <Route
                        path="/"
                        element={
                            <ProtectedRoute>
                                <Today />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/meddelanden"
                        element={
                            <ProtectedRoute>
                                <Messages />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/kunder"
                        element={
                            <ProtectedRoute>
                                <div className="min-h-screen bg-background flex flex-col">
                                    <Header />
                                    <CustomerList />
                                </div>
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/kund/:id"
                        element={
                            <ProtectedRoute>
                                <div className="min-h-screen bg-background flex flex-col">
                                    <Header />
                                    <CustomerDetail />
                                </div>
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </BrowserRouter>
            <Toaster />
        </div>
    );
}



export default App;
