import React from "react";
import {useBrand} from '../../context/BrandContext';
export default function AppFooter() {
  const {config}=useBrand();
  return (
    <footer className="app-footer">
      <span>{config?.name || 'Peanut OS'}</span>
      <a href="/dashboard/configuracoes/preferencias/aparencia">
        Personalizar sua experiência
      </a>
    </footer>
  );
}
