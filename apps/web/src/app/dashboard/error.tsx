'use client';
import React from 'react';
import Button from '../../components/ui/Button';
export default function ErrorPage({reset}:{reset:()=>void}){return <section role="alert" className="settings-panel space-y-md"><h1>Não foi possível abrir esta tela</h1><p>Seus dados salvos foram preservados. Tente novamente.</p><div className="flex gap-md"><Button onClick={reset}>Tentar novamente</Button><a href="/dashboard" className="create-button">Ir para o início</a></div></section>;}
