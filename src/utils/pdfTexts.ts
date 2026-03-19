/**
 * Estemco PDF Text Dictionary
 * Centralizes all static, legal and specific clauses for Proposals and Daily Reports.
 */

export const pdfTexts = {
  header: {
    address: 'Rod. Capitão Barduíno, Km 131 Margem da SP 008 - Socorro/SP',
    contact: 'Tel: (19) 3895-2630 / WhatsApp: (19) 9.9703.8028 | contato@estemco.com.br',
    companyName: 'ESTEMCO ENGENHARIA EM FUNDAÇÕES S/S LTDA',
    cnpj: '57.486.102/0001-86'
  },

  proposals: {
    titles: {
      HCM: 'PROPOSTA DE PRESTAÇÃO DE SERVIÇOS DE HÉLICE CONTÍNUA MONITORADA',
      ESC: 'PROPOSTA DE PRESTAÇÃO DE SERVIÇO DE ESTACAS TIPO ESCAVADA MECANICAMENTE',
      SPT: 'PROPOSTA PARA EXECUÇÃO DO SERVIÇO DE SONDAGEM DE SIMPLES RECONHECIMENTO DE SOLO SPT',
      GENERIC: 'PROPOSTA DE PRESTAÇÃO DE SERVIÇOS'
    },

    hcm: {
      intro: 'Prezado(a), conforme solicitado, segue orçamento para execução das estacas do tipo HÉLICE CONTÍNUA MONITORADA.',
      timing: (dias: number) => `Levando em conta o quantitativo apresentado pela contratante, o prazo para a exeução para esta referida obra será de ${dias} dias úteis trabalhados. A data de início da prestação de serviços fica a combinar.`,
      minBilling: {
        title: 'ESTA PRESTAÇÃO DE PRESTAÇÃO SERVIÇOS CONTEMPLA O FATURAMENTO MÍNIMO DA DIÁRIA, DE R$ 8.000,00 QUE SERÁ APLICADO NAS SEGUINTE CONDIÇÕES:',
        items: [
          'O faturamento mínimo será cobrado em todos os demais eventos que não demandem responsabilidade da contratada, incluindo, a título de exemplo, a ineficiência no fornecimento de concreto, quebra de bomba de concreto, entupimento dos mangotes da bomba e do equipamento, atraso por falta de locação correta, horários restritos em condomínios e ou fabricas, dificuldades de perfuração advindas ao terreno, tais como entulho, matacões, estruturas de construções anteriores, que venham a atrasar ou impedir a produção, entre outras.',
          'Caso as estacas serem em blocos os quais não possam ser executadas no mesmo dia conforme norma NBR 6122:2019, Anexo N.7 (não se devem executar estacas com espaçamento inferior a cinco diâmetros em intervalo inferior a 12 h), deverá ser pago à proponente o faturamento mínimo diário de R$ 8.000,00 APLICASSE FATURAMENTO MIMIMO DIÁRIO, EM QUALQUER OCORRIDO QUE COMPROMETE O RENDIMENTO OU INVIABILIZA EXECUÇÃO DO SERVIÇO CONTRATADO.'
        ]
      },
      exemption: {
        title: 'DA ISENÇÃO DO PAGAMENTO DO FATURAMENTO MÍNIMO',
        items: [
          'Ficará isento do pagamento faturamento mínimo por questões climáticas;',
          'Ficará isento do pagamento do faturamento mínimo caso houver problemas com o equipamento de perfuração hélice contínua monitorada.'
        ]
      },
      generalBilling: {
        title: 'DAS COBRANÇAS EM GERAL',
        items: [
          'O comprimento mínimo cobrado por estaca é de 5,00m;',
          'O dia trabalhado será considerado das 7h às 17h, com pausa de 1h para almoço de segunda-feira a sexta-feira, sendo que produção fora deste horário não será aferida para cálculo de incidência de faturamento mínimo;',
          'A produção fora de horário programado desta proposta e aos sábados, se dará com acréscimo de 30% sob o valor contratado, incluindo valores referentes a faturamento mínimo, sendo facultado a CONTRATADA por mera liberalidade, a não cobrança deste acréscimo;',
          'A mobilização será cobrada cada vez que houver mobilização e desmobilização do equipamento.'
        ]
      },
      responsibilities: {
        contratante: [
          'Será responsabilidade do CONTRATANTE qualquer dano a rede subterrâneas e ou instalações e construções vizinhas advindas do serviço de execução de estacas, bem como contratação de eventual Seguro da Obra;',
          'A CONTRATANTE deverá garantir que nenhuma estaca tenha sido deixada de executar devido a erros de locação ou não localização, devido ao acumulo de terra no canteiro ou qualquer outro motivo;',
          'Cabe a CONTRATANTE informar de antemão qualquer regra e ou documentação necessária para a entrada, permanência e execução dos trabalhos, sob óbice de, não informando, nos eximirmos de culpa pela falta que venha a gerar ônus ao CONTRATANTE.',
          'A CONTRATANTE se responsabilizará pela limpeza de todo o material escavado decorrente da execução das estacas, e das vias por onde o equipamento venha a manobrar para entrada no canteiro de obra (quando necessário ou exigido por condomínio, fabricas e etc.);',
          'Fornecimento e controle tecnológico do concreto usinado para HÉLICE CONTINUA (FCK 30 Mpa (NBR 6122/19), Slump 230 +- 20mm, brita zero e consumo mínimo de 350 kg cimento/m3);',
          'Fornecimento de bomba para concreto com rendimento teórico de 34m³/h (Sugestão: Schwing SPL 1000 ou similar), sendo imprescindível que o equipamento contratado alcance o rendimento requisitado, com tolerância de 10% para mais ou para menos, para evitar embuchamento do trado no solo e ou comprometer a qualidade da estaca, sendo vedado fornecimento de equipamento fora destas especificações;',
          'O terreno deverá estar preparado de modo a estar nivelado, seco e 1,5 metro acima do nível do lençol freático e ou de trecho que não permita sustentação do equipamento, assim como desobstruído de qualquer obstáculo, aparente ou não, que possa dificultar e ou impedir a realização dos serviços, tais como árvores, redes elétricas, tubulações subterrâneas e excesso de barro e afins;',
          'As estacas deverão estar marcadas cerca de 20cm de distância a contar de sua face, de qualquer objeto, beiral, muro, telhado, baldrames e blocos de fundações de obras vizinhas, etc., que impeçam a sua execução, e 55cm dos cantos de muros e construções;',
          'Fornecimento de um ponto de água (potável) no local para lavagem do equipamento e para o uso da equipe.;',
          'Fornecimento de instalações sanitárias;',
          'A locação e determinação da profundidade das estacas, de acordo com o projeto de fundações e ou previsão baseada em Sondagem;',
          'Fornecimento da Sondagem e Projeto de Fundações ou estrutural na falta deste;',
          'E responsabilidade do CONTRATANTE qualquer dano a rede subterrâneas e ou instalações e construções vizinhas advindas do serviço de execução de estacas, bem como contratação de eventual Seguro da Obra..',
          'Fornecimento de dois sacos de cimento por dia para lubrificação da bomba para o começo dos trabalhos.',
          'Contratação de retroescavadeira ou similar para retirada do material escavado durante a perfuração, quando necessário, inclusive para desobstrução e localização das estacas demarcadas que estejam soterradas ou de difícil localização devido a escavação e/ou passagem de máquinas;',
          'Fornecimento de escoras e/ou nova terraplanagem com colocação ou não de cascalho ou rachão quando necessário e requisitado;',
          'Contratação de pessoal ou maquinário para colocação das armaduras nas estacas, sendo que, a CONTRATADA poderá por mera liberalidade ajudar ou colocá-las, sem que isso se torne obrigação contratual ou gere qualquer responsabilidade caso não seja possível sua colocação de acordo com projeto.'
        ],
        proponente: [
          'Fornecimento de toda mão-de-obra, ferramentas e equipamentos especializados para execução dos serviços;',
          'Fornecimento de EPIs para os funcionários da ESTEMCO;',
          'Encargos sobre mão-de-obra e faturamento;',
          'Fornecimento dos relatórios, gráficos e laudos da prestação de serviço;',
          'Realizar o controle dos acontecimentos em obras através de relatório diário;',
          'Manter o CONTRATANTE Informado, sobre o andamento e ocorridos da obra.',
          'A ESTEMCO se responsabiliza por eventuais perdas de concreto e diária de bomba caso ocorra a quebra do equipamento da mesma;'
        ]
      }
    },

    responsibilities: {
      proponente: [
        'Fornecimento de toda mão-de-obra, ferramentas e equipamentos especializados para execução dos serviços;',
        'Fornecimento de EPIs para os funcionários da ESTEMCO;',
        'Encargos sobre mão-de-obra e faturamento;'
      ],
      contratante: [
        'Demarcação dos furos por topografia;',
        'Terreno desimpedido, limpo e nivelado para o transporte e locomoção do equipamento;',
        'Fornecimento de água e energia elétrica (110/220v) no local.'
      ]
    },

    riskClause: 'A ESTEMCO se reserva ao direito de suspender a execução dos serviços quando o excesso de barro e ou material advindo ou não da escavação, impedir, dificultar, atrapalhar ou não favorecer a segurança dos trabalhos, sendo que o tempo em que o equipamento e funcionários ficarem à disposição, será cobrado como HORA PARADA conforme item 4 das cobranças.',

    acceptanceTerm: 'Pelo presente, declaramos estar ciente e de acordo com as exigências dos itens desta Proposta. Por esta razão, autorizamos a execução dos serviços conforme as especificações e condições comerciais aqui descritas.'
  },

  reports: {
    dailyTitle: 'RELATÓRIO DIÁRIO DE OBRA E MEDIÇÃO',
    sections: {
      improductiveTimes: 'Detalhamento de Tempos Improdutivos (Paradas)',
      financialMeasurement: 'Medição Financeira'
    }
  }
};
