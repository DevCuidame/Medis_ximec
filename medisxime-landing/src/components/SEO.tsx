import { Helmet } from 'react-helmet-async'

interface SEOProps {
  title?: string
  description?: string
  canonical?: string
}

const DEFAULT_TITLE = 'Medis · Dra. Ximena Correa - Medicina Laboral y Bioreguladora'
const DEFAULT_DESCRIPTION =
  'Medis — Consultorio de la Dra. Ximena Correa, especialista en Medicina Bioreguladora, exámenes médico-ocupacionales, Medicina Laboral y consultoría en el SGSST. Salud en el trabajo para tu equipo y para ti.'

export function SEO({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  canonical,
}: SEOProps) {
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {canonical && <link rel="canonical" href={canonical} />}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
    </Helmet>
  )
}
