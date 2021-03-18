import React, {FunctionComponent} from 'react';
import './App.css';
// @ts-ignore
import {select} from 'd3-selection'
import {IEdge, IGraph, IVertex, SccBuilder} from 'graphlabs.core.graphs'
import {GraphVisualizer, IGraphView, store, Template, Toolbar, ToolButtonList} from "graphlabs.core.template";
// @ts-ignore
import {Matrix} from "graphlabs.core.lib";


class App extends Template {

    task_part: number = 1; // флаг этапа задания

    cyclematrix: number[][] = []; // матрица циклов, построенная студентом

    cutsmatrix: number[][] = []; // матрица разрезов, построенная студентом

    student_tree: string[] = []; // остовное дерево, построенное студентом

    student_not_tree: string[] = []; // ребра, не добавленные студентом в остов

    min_trees: string[][] = []; // массив минимальных остовов, построенных системой

    helper_tree: string[][][] = [];  // вспомогательный массив, хранящий букеты вершин при построении остова

    graph: IGraph<IVertex, IEdge> = this.get_graph(); // граф, заданный вариантом

    constructor(props: {}) {
        super(props);
        this.getArea = this.getArea.bind(this);
    }

    protected getArea(): React.FunctionComponent {
        this.graph = this.get_graph();
        // @ts-ignore
        store.getState().graph = this.graph;
        return () => <GraphVisualizer
            graph={this.graph}
            adapterType={'readable'}
            namedEdges={true}
            incidentEdges={false}
        />;
    }

    compare_edges(edge1: IEdge, edge2: IEdge): number {
        if (edge1.name > edge2.name) {
            return 1;
        } else if (edge1.name < edge2.name) {
            return -1;
        }
        return 0;
    }

    add_to_tree(tree: string[], edge: IEdge, helpertree: string[][]) {
        let foundStart: number = -1;
        let foundEnd: number = -1;
        let help: string[] = [];
        for (let i = 0; i < helpertree.length; i++) {
            if (helpertree[i].indexOf(edge.vertexOne.name) !== -1) {
                foundStart = i;
            }
            if (helpertree[i].indexOf(edge.vertexTwo.name) !== -1) {
                foundEnd = i;
            }
        }
        if (foundStart === -1 && foundEnd === -1) {
            helpertree.push([edge.vertexOne.name, edge.vertexTwo.name]);
            tree.push(`#edge_${edge.vertexOne.name}_${edge.vertexTwo.name}`)

        } else if (foundStart === -1 && foundEnd !== -1) {
            helpertree[foundEnd].push(edge.vertexOne.name);
            tree.push(`#edge_${edge.vertexOne.name}_${edge.vertexTwo.name}`)
        } else if (foundStart !== -1 && foundEnd === -1) {
            helpertree[foundStart].push(edge.vertexTwo.name);
            tree.push(`#edge_${edge.vertexOne.name}_${edge.vertexTwo.name}`)
        } else if (foundStart !== -1 && foundEnd !== -1 && foundEnd !== foundStart) {
            help = helpertree[foundEnd];
            helpertree[foundStart] = helpertree[foundStart].concat(help);
            helpertree.splice(foundEnd, 1);
            tree.push(`#edge_${edge.vertexOne.name}_${edge.vertexTwo.name}`)
        }
    }

    add_i(index: number, edges: IEdge[], width: number, count: number) {
        if (edges.length === 0)
            return []
        if (this.min_trees.length === 0) {
            for (let i = 0; i < edges.length; i++) {
                this.min_trees.push([]);
                this.helper_tree.push([])
            }

        } else if (edges.length > 1 && count === 0) {
            let help: string[][] = this.min_trees.slice();
            let help2: string[][][] = this.helper_tree.slice();
            for (let i = 0; i < edges.length - 1; i++) {
                for (let j = 0; j < help.length; j++) {
                    this.min_trees.push(help[j].slice());
                    this.helper_tree.push(help2[j].slice());
                }
            }
        }
        if (edges.length === 0) {
            for (let i = 0; i < this.min_trees.length; i++) {
                this.add_to_tree(this.min_trees[i], edges[i], this.helper_tree[i]);
            }
        } else {
            let edges_copy: IEdge[] = edges.slice();
            if (index - width < 0) {
                this.add_to_tree(this.min_trees[index], edges[index], this.helper_tree[index]);
                edges_copy.splice(index, 1);
            } else {
                this.add_to_tree(this.min_trees[index], edges[index - width], this.helper_tree[index]);
                edges_copy.splice(index - width, 1);
            }
            if (edges_copy.length > 0) {
                this.add_i(index, edges_copy, width + 1, 0);
            }

        }
    }

    group_by_weight() {
        let edges: IEdge[] = this.get_graph().edges.sort(this.compare_edges);
        let edges_by_weight: IEdge[][] = [];
        let weight: string = "";
        let index: number = -1;
        edges.forEach(edge => {
            if (edge.name !== weight) {
                weight = edge.name;
                index += 1;
                edges_by_weight.push([]);
            }
            edges_by_weight[index].push(edge);
        })
        return edges_by_weight;
    }

    get_min_trees() {
        let edges_by_weight: IEdge[][] = this.group_by_weight();
        edges_by_weight.forEach(edges => {
            for (let i = 0; i < edges.length; i++)
                this.add_i(i, edges, 0, i);
        })
        let graph: IGraph<IVertex, IEdge> = this.get_graph();
        let n: number = graph.vertices.length;
        let c: number = SccBuilder.findComponents(graph).length;
        for (let i = this.min_trees.length - 1; i >= 0; i--) {
            if (this.min_trees[i].length !== n - c) {
                this.min_trees.splice(i, 1)
            }
        }
        /*if (this.min_trees.length === 0){
            this.min_trees.push([]);
            this.helper_tree.push([]);
        }
        edges.forEach(edge =>{
            for (let i = 0; i < this.min_trees.length; i++){
                this.add_to_tree(this.min_trees[i], edge, this.helper_tree[i]);
            }
        })
        */
    }

    get_graph(): IGraph<IVertex, IEdge> {
        const graph: IGraphView = store.getState().graph;
        let data = [
            {
                "type": "graph",
                "value": {
                    "vertices": [""],
                    "edges": [{
                        "source": "",
                        "target": "",
                        "name": ""
                    }]
                }

            }
        ]
        let vertices = graph.vertices;
        let edges = graph.edges;
        let i = 0;
        data[0].value.vertices.shift();
        vertices.forEach(() => {
            i = data[0].value.vertices.push(i.toString());
        });
        data[0].value.edges.shift();
        edges.forEach((e: any) => {
            if (e.name) {
                data[0].value.edges.push({"source": e.vertexOne, "target": e.vertexTwo, "name": e.name})
            } else {
                data[0].value.edges.push({
                    "source": e.vertexOne,
                    "target": e.vertexTwo,
                    "name": Math.round(Math.random() * 10).toString()
                })
            }
        });
        return this.graphManager(data[0].value);
    }

    change_color(color: string) {
        const Out = sessionStorage.getItem('out');
        const In = sessionStorage.getItem('in');
        sessionStorage.removeItem('out');
        sessionStorage.removeItem('in');
        select(`#edge_${Out}_${In}`).style('stroke', color);
    }

    update_colors() {
        let edges: IEdge[] = this.graph.edges;
        edges.forEach(edge => {
            if (this.student_tree.indexOf(`#edge_${edge.vertexOne.name}_${edge.vertexTwo.name}`) !== -1) {
                select(`#edge_${edge.vertexOne.name}_${edge.vertexTwo.name}`).style('stroke', "blue");
            } else if (this.student_not_tree.indexOf(`#edge_${edge.vertexOne.name}_${edge.vertexTwo.name}`) !== -1) {
                select(`#edge_${edge.vertexOne.name}_${edge.vertexTwo.name}`).style('stroke', "red");
            }
        })
    }

    getTaskToolbar() {
        Toolbar.prototype.getButtonList = () => {
            function beforeComplete(this: App): Promise<{ success: boolean; fee: number }> {
                return new Promise((resolve => {
                    resolve(this.calculate());
                }));
            }

            ToolButtonList.prototype.beforeComplete = beforeComplete.bind(this);
            ToolButtonList.prototype.help = () =>
                'Подсказка';
            ToolButtonList.prototype.toolButtons = {
                "http://gl-backend.svtz.ru:5000/odata/downloadImage(name='color_blue.png')": () => {
                    this.change_color('blue');
                },
                "http://gl-backend.svtz.ru:5000/odata/downloadImage(name='color_red.png')": () => {
                    this.change_color('red');
                },
            };
            return ToolButtonList;
        };
        return Toolbar;
    }

    get_edges() {
        let edges: IEdge[] = this.get_graph().edges.sort(this.compare_edges);
        let result: string[] = [];
        edges.forEach(edge => result.push(`${edge.vertexOne.name}_${edge.vertexTwo.name}`));
        return result;
    }

    // @ts-ignore
    task(): FunctionComponent<{}> {
        const graph: IGraph<IVertex, IEdge> = this.get_graph();
        let m: number = graph.edges.length;
        let n: number = graph.vertices.length;
        let c: number = SccBuilder.findComponents(graph).length;
        let edges: string[] = this.get_edges().sort();
        let edges_print: string[] = []
        for (let i = 0; i < edges.length; i++) {
            edges_print.push(edges[i]);
            edges_print.push(" ");
        }
        if (this.task_part === 1) {
            return () => (
                <div id="task">
                    <p>Постройте остовное дерево, заполните матрицу циклов и нажмите кнопку "Следующий этап"</p>
                    <button onClick={() => {
                        this.task_part += 1;
                        this.get_student_tree();
                        this.forceUpdate();
                    }}>Следующий этап
                    </button>
                    <p>Порядок ребер в матрице:</p>
                    <p>{edges_print}</p>
                    <Matrix
                        rows={m + c - n}
                        columns={graph.edges.length}
                        readonly={false}
                        handler={(values: number[][]) => this.cyclematrix = values}
                    />
                </div>
            );
        }
        if (this.task_part === 2) {
            return () => (
                <div>
                    <p>Востановите уже построенное Вами остовное дерево, нажав на кнопку "Восстановить остов", и
                        заполните матрицу разрезов</p>
                    <button onClick={() => {
                        this.update_colors();
                    }}>Восстановить остов
                    </button>
                    <p>Порядок ребер в матрице:</p>
                    <p>{edges_print}</p>
                    <Matrix
                        rows={n - c}
                        columns={graph.edges.length}
                        readonly={false}
                        handler={(values: number[][]) => {this.cutsmatrix = values}}
                    />
                </div>
            );
        }
    }

    get_student_tree() {
        let edges: IEdge[] = this.graph.edges;
        let edge_name: string = "";
        edges.forEach(edge => {
            edge_name = `#edge_${edge.vertexOne.name}_${edge.vertexTwo.name}`;
            if (select(edge_name).style('stroke') === "blue" && this.student_tree.indexOf(edge_name) === -1) {
                this.student_tree.push(edge_name);
            } else if (select(edge_name).style('stroke') === "red" && this.student_not_tree.indexOf(edge_name) === -1) {
                this.student_not_tree.push(edge_name);
            }
        })
    }

    check_tree() {
        let tree_found: boolean = false;
        this.get_min_trees();
        this.get_student_tree();
        this.min_trees.forEach(tree => {
            if (tree.length === this.student_tree.length) {
                for (let i = 0; i < tree.length; i++)
                    if (tree.sort()[i] === this.student_tree.sort()[i]) {
                        if (i === tree.length - 1) {
                            tree_found = true;
                            break;
                        }
                    }
            }
        })
        return tree_found;
    }

    check_cycles() {
        let edges: string[] = this.get_edges().sort();
        let cycles: string[][] = [];
        let matrix_done: boolean = true;
        let help_count: number = 0;
        for (let i = 0; i < this.cyclematrix.length; i++) {
            help_count = 0;
            cycles.push([])
            for (let j = 0; j < this.cyclematrix[0].length; j++) {
                if (this.cyclematrix[i][j] === 1) {
                    cycles[i].push(edges[j].substring(0, edges[j].indexOf("_")));
                    cycles[i].push(edges[j].substring(edges[j].indexOf("_") + 1, edges[j].length));
                }
            }
            if (cycles[i].length === 0) {
                matrix_done = false
            } else {
                for (let j = 0; j < this.cyclematrix[0].length; j++) {
                    if (this.student_tree.indexOf(`#edge_${edges[j]}`) === -1 && this.cyclematrix[i][j] === 1) {
                        if (help_count > 0) {
                            matrix_done = false
                        }
                        help_count += 1;
                    }
                }
                cycles[i].sort();
                for (let j = 1; j < this.cyclematrix[0].length; j += 2) {
                    if (!(cycles[i][j] === cycles[i][j - 1] && cycles[i][j] !== cycles[i][j + 1])) {
                        matrix_done = false
                    }
                }
            }
        }
        return matrix_done;
    }

    check_cuts() {
        let matrix_done: boolean = true;
        let new_graph: IGraph<IVertex, IEdge> = this.get_graph();
        let edges: IEdge[] = this.get_graph().edges;
        let edges_str: string[] = this.get_edges().sort();
        for (let i = 0; i < this.cutsmatrix.length; i++) {
            new_graph = this.get_graph();
            for (let j = 0; j < this.cutsmatrix[0].length; j++) {
                let help1 = edges_str[j].substring(0, edges_str[j].indexOf("_"));
                let help2 = edges_str[j].substring(edges_str[j].indexOf("_") + 1, edges_str[j].length);
                if (this.cutsmatrix[i][j] === 1) {
                    edges.forEach(edge => {
                        if (edge.vertexOne.name === help1 && edge.vertexTwo.name === help2) {
                            new_graph.edges.splice(new_graph.edges.indexOf(edge), 1);
                        }
                    })

                }
            }
            if (SccBuilder.findComponents(this.get_graph()).length === SccBuilder.findComponents(new_graph).length) {
                matrix_done = false;
            }
        }
        return matrix_done;
    }

    calculate() {
        let res: number = 0;
        if (!this.check_tree()) {
            res += 50;
        }
        if (!this.check_cycles()) {
            res += 15;
        }
        if (!this.check_cuts()) {
            res += 15;
        }
        return {success: res === 0, fee: res}
    }
}
export default App;
