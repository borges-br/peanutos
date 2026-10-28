'use client';
import React from 'react';
import Link from 'next/link';
export default function NotificationsPage(){return <div className="space-y-lg max-w-3xl"><header className="page-heading"><h1>Notificações e envios</h1></header><div className="settings-panel space-y-md"><h2>Como deseja entrar em contato?</h2><Link className="quick-action" href="/dashboard/configuracoes?tab=notificacoes">Configurar email e avisos <span>↗</span></Link><Link className="quick-action" href="/dashboard/templates-email">Editar modelos de email <span>↗</span></Link><Link className="quick-action" href="/dashboard/contracts">Revisar envios dos contratos <span>↗</span></Link></div></div>;}
