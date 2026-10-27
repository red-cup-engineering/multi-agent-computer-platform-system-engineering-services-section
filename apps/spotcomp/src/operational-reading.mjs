import { identifyJsonSemanticContent, identifyBytesSemanticContent, identifyProofPathWitness, identifyProofPathedJsonSemanticContent, EMPTY_WITNESS_ROOT } from '@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/semantic-content-identity';
import { identifyFiniteGenerativeStructure, qualifyGenerativeProofPath } from '@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/proof-path';
import { iriTerm, literal } from '@red-cup-engineering/computer-triplet-serialized-content-engineering-services-section/rdf-terms';
import { serializeNQuads } from '@red-cup-engineering/computer-triplet-serialized-content-engineering-services-section/n-quads';
import { cell, sym, str } from '@561-group/horsetail/types';

export function projectOperationalReading({ recordBytes, source, language = 'lkt' } = {}) {
  if (!(recordBytes instanceof Uint8Array) || recordBytes.length < 1 || recordBytes.length > 32768) throw new Error('invalid recordBytes');
  if (source === null || typeof source !== 'object' || Array.isArray(source)) throw new Error('invalid source');
  if (language !== 'lkt') throw new Error('invalid language');
  const text = new TextDecoder('utf-8', { fatal: true }).decode(recordBytes);
  const entry = JSON.parse(text);
  if (!entry || entry.kind !== 'communicating-in-lakota.corpus-entry') throw new Error('missing corpus entry');
  if (typeof entry.text !== 'string') throw new Error('invalid entry.text');
  if (!entry.expect || typeof entry.expect.generation !== 'object' || entry.expect.generation === null || Array.isArray(entry.expect.generation)) throw new Error('invalid generation');
  const { surface } = entry.expect.generation;
  if (typeof surface !== 'string' || surface.length === 0 || surface.length > 4096) throw new Error('invalid surface');
  const locator = identifyJsonSemanticContent({ objectKind: 'spotcomp.source-locator', value: source, witnessRoot: EMPTY_WITNESS_ROOT });
  const record = identifyBytesSemanticContent({ objectKind: 'spotcomp.source-corpus-record', bytes: recordBytes, mediaType: 'application/x-ndjson', witnessRoot: locator.id });
  const entryMaterial = identifyJsonSemanticContent({ objectKind: 'spotcomp.corpus-entry', value: entry, witnessRoot: record.id });
  const generation = identifyJsonSemanticContent({ objectKind: 'spotcomp.generation', value: entry.expect.generation, witnessRoot: entryMaterial.id });
  const predicate = 'urn:561:json-member:expect.generation';
  const structure = identifyFiniteGenerativeStructure({
    value: {
      version: 1,
      nodes: [
        { key: 'entry', cell: { subject: entryMaterial.id, predicate, object: generation.id } },
        { key: 'generation', cell: { subject: generation.id, predicate, object: generation.id } }
      ],
      edges: [{ from: 'entry', generator: 'object-projection', to: 'generation' }],
      predicateMaps: []
    },
    witnessRoot: record.id
  });
  const path = identifyProofPathWitness({
    structureRoot: structure.id,
    sourceKey: 'entry',
    targetKey: 'generation',
    path: 'entry/object-projection/library/generation',
    witnessRoot: record.id
  });
  const qualification = qualifyGenerativeProofPath({
    structureBytes: structure.bytes,
    structureRoot: structure.id,
    witnessBytes: path.bytes,
    witnessRoot: path.id
  });
  const reading = identifyProofPathedJsonSemanticContent({
    objectKind: 'spotcomp.operational-reading',
    value: {
      sourceRecord: record.id,
      sourceEntry: entryMaterial.id,
      generation: generation.id,
      language,
      surface,
      sourceSentence: entry.text,
      cell: qualification.targetCell
    },
    proofPathWitnessRoot: path.id
  });
  const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
  const SCHEMA = 'https://schema.org/';
  const PROV = 'http://www.w3.org/ns/prov#';
  const rows = [
    { e: iriTerm(reading.id), a: iriTerm(RDF + 'type'), v: iriTerm(RDF + 'Statement'), t: record.id },
    { e: iriTerm(reading.id), a: iriTerm(RDF + 'subject'), v: iriTerm(qualification.targetCell.subject), t: record.id },
    { e: iriTerm(reading.id), a: iriTerm(RDF + 'predicate'), v: iriTerm(qualification.targetCell.predicate), t: record.id },
    { e: iriTerm(reading.id), a: iriTerm(RDF + 'object'), v: iriTerm(qualification.targetCell.object), t: record.id },
    { e: iriTerm(reading.id), a: iriTerm(SCHEMA + 'text'), v: literal(surface, { language }), t: record.id },
    { e: iriTerm(reading.id), a: iriTerm(SCHEMA + 'description'), v: literal(entry.text, { language }), t: record.id },
    { e: iriTerm(reading.id), a: iriTerm(PROV + 'wasDerivedFrom'), v: iriTerm(record.id), t: record.id },
    { e: iriTerm(reading.id), a: iriTerm(PROV + 'wasDerivedFrom'), v: iriTerm(entryMaterial.id), t: record.id },
    { e: iriTerm(reading.id), a: iriTerm(PROV + 'wasDerivedFrom'), v: iriTerm(path.id), t: record.id }
  ];
  const nquads = serializeNQuads(rows.map(r => ({ subject: r.e.value, predicate: r.a.value, object: r.v, graph: r.t })));
  const query = 'SELECT ?text ?source WHERE { <' + reading.id + '> <' + SCHEMA + 'text> ?text . <' + reading.id + '> <' + PROV + 'wasDerivedFrom> ?source } LIMIT 8';
  const sparql = { url: 'https://market.561.group/v1/knowledge/sparql', method: 'POST', body: { rows, query } };
  const svgForm = cell([sym('quote'), cell([sym('qualified-reading'), str(surface), str(language), str(reading.id), str(path.id), str(record.id)])]);
  const roots = Object.freeze({
    locator: locator.id,
    record: record.id,
    entry: entryMaterial.id,
    generation: generation.id,
    structure: structure.id,
    path: path.id,
    reading: reading.id
  });
  const carriers = Object.freeze({
    locator: { id: locator.id, bytes: locator.bytes },
    record: { id: record.id, bytes: record.bytes },
    entry: { id: entryMaterial.id, bytes: entryMaterial.bytes },
    generation: { id: generation.id, bytes: generation.bytes },
    structure: { id: structure.id, bytes: structure.bytes },
    path: { id: path.id, bytes: path.bytes },
    reading: { id: reading.id, bytes: reading.bytes }
  });
  return Object.freeze({
    kind: 'spotcomp.operational-reading/v1',
    language,
    surface,
    roots,
    carriers,
    qualification,
    rows: Object.freeze(rows),
    nquads,
    sparql,
    svgForm
  });
}
